/*
	Seventh
	
	Copyright (c) 2017 Cédric Ronvel
	
	The MIT License (MIT)
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



var Promise = require( './Promise.js' ) ;



exports.promisifyAll = ( nodeAsyncFn , thisBinding , ... argsBinding ) => {
	
	return ( ... args ) => {
		
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( thisBinding , ... argsBinding , ... args , ( error , ... cbArgs ) => {
				if ( error )
				{
					reject( error ) ;
					return ;
				}
				
				resolve( cbArgs ) ;
			} ) ;
		} ) ;
	} ;
} ;



// Same than .promisifyAll() but only return the callback args #1 instead of an array of args from #1 to #n
exports.promisify = ( nodeAsyncFn , thisBinding , ... argsBinding ) => {
	
	return ( ... args ) => {
		
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( thisBinding , ... argsBinding , ... args , ( error , cbArg ) => {
				if ( error )
				{
					reject( error ) ;
					return ;
				}
				
				resolve( cbArg ) ;
			} ) ;
		} ) ;
	} ;
} ;



/*
	Pass a function that will be called every time the decoratee return something.
*/
exports.returnValueInterceptor = ( interceptor , asyncFn , thisBinding , ... argsBinding ) => {
	
	return ( ... args ) => {
		
		var returnVal = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
		interceptor( returnVal ) ;
		return returnVal ;
	} ;
} ;



/*
	Run only once, return always the same promise.
*/
exports.once = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	var triggered = false ;
	var result ;
	
	return ( ... args ) => {
		
		if ( ! triggered )
		{
			triggered = true ;
			result = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
		}
		
		return result ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress, but return the promise of the action in progress.
*/
exports.debounce = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	var inProgress = null ;
	
	const outWrapper = () => {
		inProgress = null ;
	} ;
	
	return ( ... args ) => {
		
		if ( inProgress ) { return inProgress ; }
		
		inProgress = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
		inProgress.then( outWrapper , outWrapper ) ;
		return inProgress ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress.
	Instead, the decoratee is called when finished once and only once, if it was tried one or more time during its progress.
	In case of multiple calls, the arguments of the last call will be used.
	The use case is .update()/.refresh()/.redraw() functions.
*/
exports.debounceUpdate = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	var inProgress = null ;
	var nextUpdateWith = null ;
	var nextUpdatePromise = null ;
	
	const outWrapper = () => {
		var args , sharedPromise ;
		
		inProgress = null ;
		
		if ( nextUpdateWith )
		{
			args = nextUpdateWith ;
			nextUpdateWith = null ;
			sharedPromise = nextUpdatePromise ;
			nextUpdatePromise = null ;
			
			// Call the asyncFn again
			inProgress = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
			
			// Forward the result to the pending promise
			inProgress.then( ( value ) => sharedPromise.resolve( value ) , ( error ) => sharedPromise.reject( error ) ) ;
			
			// BTW, trigger again the outWrapper
			inProgress.then( outWrapper , outWrapper ) ;
			
			return inProgress ;
		}
	} ;
	
	const inWrapper = ( ... args ) => {
		
		if ( inProgress )
		{
			if ( ! nextUpdatePromise ) { nextUpdatePromise = new Promise() ; }
			nextUpdateWith = args ;
			return nextUpdatePromise ;
		}
		
		inProgress = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
		inProgress.then( outWrapper , outWrapper ) ;
		return inProgress ;
	} ;
	
	return inWrapper ;
} ;



/*
	The decoratee execution does not overlap, multiple calls are serialized.
*/
exports.serialize = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	var lastPromise = new Promise.resolve() ;
	
	return ( ... args ) => {
		
		var promise = new Promise() ;
		
		lastPromise.finally( () => {
			asyncFn.call( thisBinding , ... argsBinding , ... args )
				.then( ( value ) => promise.resolve( value ) , ( error ) => promise.reject( error ) ) ;
		} ) ;
		
		lastPromise = promise ;
		
		return promise ;
	} ;
} ;



exports.timeout = ( timeout , asyncFn , thisBinding , ... argsBinding ) => {
	
	return ( ... args ) => {
		
		var promise = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
		
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		
		return promise ;
	} ;
} ;



// Like .timeout(), but here the timeout value is not passed at creation, but as the first arg of each call
exports.variableTimeout = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	return ( timeout , ... args ) => {
		
		var promise = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
		
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		
		return promise ;
	} ;
} ;



exports.retry = ( retryCount , retryTimeout , timeoutMultiplier , asyncFn , thisBinding , ... argsBinding ) => {
	
	return ( ... args ) => {
		
		var lastError ,
			count = retryCount ,
			timeout = retryTimeout ,
			globalPromise = new Promise() ;
		
		const callAgain = () => {
			if ( count -- < 0 )
			{
				globalPromise.reject( lastError ) ;
				return ;
			}
			
			var promise = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
			
			promise.then(
				//( value ) => globalPromise.resolve( value ) ,
				( value ) => {
					globalPromise.resolve( value ) ;
				} ,
				( error ) => {
					lastError = error ;
					setTimeout( callAgain , timeout ) ;
					timeout *= timeoutMultiplier ;
				}
			) ;
		} ;
		
		callAgain() ;
		
		return globalPromise ;
	} ;
} ;



exports.variableRetry = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	return ( retryCount , retryTimeout , timeoutMultiplier , ... args ) => {
		
		var lastError ,
			count = retryCount ,
			timeout = retryTimeout ,
			globalPromise = new Promise() ;
		
		const callAgain = () => {
			if ( count -- < 0 )
			{
				globalPromise.reject( lastError ) ;
				return ;
			}
			
			var promise = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
			
			promise.then(
				( value ) => globalPromise.resolve( value ) ,
				( error ) => {
					lastError = error ;
					setTimeout( callAgain , timeout ) ;
					timeout *= timeoutMultiplier ;
				}
			) ;
		} ;
		
		callAgain() ;
		
		return globalPromise ;
	} ;
} ;


