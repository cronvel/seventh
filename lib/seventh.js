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



const seventh = {} ;
module.exports = seventh ;



seventh.Promise = require( './Promise.js' ) ;



seventh.node2promise = ( nodeAsyncFn , thisBinding , ... argsBinding ) => {
	
	const inWrapper = ( ... args ) => {
		
		return new seventh.Promise( ( resolve , reject ) => {
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
	
	return inWrapper ;
} ;



/*
	Pass a function that will be called every time the decoratee return something.
*/
seventh.returnInterceptor = ( interceptor , asyncFn , thisBinding , ... argsBinding ) => {
	
	return ( ... args ) => {
		
		var returnVal = asyncFn.call( thisBinding , ... argsBinding , ... args ) ;
		interceptor( returnVal ) ;
		return returnVal ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress.
*/
seventh.debounce = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	var inProgress = false ;
	
	const outWrapper = () => {
		inProgress = false ;
	} ;
	
	const inWrapper = ( ... args ) => {
		
		if ( inProgress ) { return Promise.resolve() ; }
		
		inProgress = true ;
		return asyncFn.call( thisBinding , ... argsBinding , ... args ).then( outWrapper , outWrapper ) ;
	} ;
	
	return inWrapper ;
} ;



/*
	It does nothing if the decoratee is still in progress.
	Instead, it is called when finished once and only once, if it was tried one or more time during its progress.
	In case of multiple calls, the arguments of the last call will be used.
	The use case is .update()/.refresh()/.redraw() functions.
*/
seventh.debounceUpdate = ( asyncFn , thisBinding , ... argsBinding ) => {
	
	var inProgress = false ;
	var updateWith = null ;
	
	const outWrapper = () => {
		inProgress = false ;
		
		if ( updateWith )
		{
			const args = updateWith ;
			updateWith = null ;
			return asyncFn.call( thisBinding , ... argsBinding , ... args ).then( outWrapper , outWrapper ) ;
		}
	} ;
	
	const inWrapper = ( ... args ) => {
		
		if ( inProgress )
		{
			updateWith = args ;
			return Promise.resolve() ;
		}
		
		inProgress = true ;
		return asyncFn.call( thisBinding , ... argsBinding , ... args ).then( outWrapper , outWrapper ) ;
	} ;
	
	return inWrapper ;
} ;

