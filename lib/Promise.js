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



const NativePromise = global.Promise ;

// Bits
const STARTED_BIT = 1 ;
const SETTLED_BIT = 2 ;
const FULFILLED_BIT = 4 ;
const REJECTED_BIT = 0 ;

// Masks
const SETTLED_MASK = STARTED_BIT | SETTLED_BIT ;

// States
const UNSTARTED = 0 ;
const PENDING = STARTED_BIT ;
const FULFILLED = SETTLED_MASK | FULFILLED_BIT ;
const REJECTED = SETTLED_MASK | REJECTED_BIT ;

// This object is used as a special unique value for array hole (see Promise.filter())
const HOLE = {} ;

function noop() {}



// Cross-platform next tick function
var nextTick ;

if ( ! process.browser )
{
	nextTick = process.nextTick ;
}
else
{
	// Browsers suck, they don't have setImmediate() except IE/Edge.
	// A module is needed to emulate it.
	require( 'setimmediate' ) ;
	nextTick = setImmediate ;
}



function Promise( fn )
{
	this.fn = fn ;
	this.status = UNSTARTED ;
	this.value = undefined ;
	this.thenHandlers = undefined ;
	this.handledRejection = undefined ;
	
	if ( this.fn ) { this.exec() ; }
}

module.exports = Promise ;



Promise.warnUnhandledRejection = true ;



Promise.prototype.exec = function exec()
{
	if ( this.status === UNSTARTED )
	{
		this.status = PENDING ;
		
		try {
			this.fn( ... this._buildCallbacks() ) ;
		}
		catch ( error ) {
			this.reject( error ) ;
		}
	}
} ;



Promise.prototype._buildCallbacks = function _buildCallbacks()
{
	var triggered = false ;
	
	return [
		
		// Fulfill callback
		( result ) => {
			this.resolve( result ) ;
		} ,
		
		// Reject callback
		( error ) => {
			this.reject( error ) ;
		}
	] ;
} ;






Promise.prototype.resolve = Promise.prototype.fulfill = function resolve( result )
{
	// Throw an error?
	if ( ( this.status & SETTLED_MASK ) === SETTLED_MASK ) { return this ; }
	
	//if ( ( result instanceof Promise ) || ( result instanceof NativePromise ) )
	if ( Promise.isThenable( result ) )
	{
		try {
			// Build new callbacks with an independant 'triggered' var
			result.then( ... this._buildCallbacks() ) ;
		}
		catch ( error ) {
			this.reject( error ) ;
		}
	}
	else
	{
		this.status = FULFILLED ;
		this.value = result ;
		
		if ( this.thenHandlers && this.thenHandlers.length ) { this.execFulfillHandlers() ; }
	}
	
	return this ;
} ;



Promise.prototype.reject = function reject( error )
{
	// Throw an error?
	if ( ( this.status & SETTLED_MASK ) === SETTLED_MASK ) { return this ; }
	
	this.status = REJECTED ;
	this.value = error ;
	
	if ( this.thenHandlers && this.thenHandlers.length )
	{
		this.execRejectionHandlers() ;
	}
	else if ( Promise.warnUnhandledRejection && ! this.handledRejection )
	{
		this.unhandledRejection() ;
	}
	
	return this ;
} ;



Promise.prototype.execFulfillHandlers = function execFulfillHandlers()
{
	// Do not cache the length, any handler can synchronously add one
	for ( let i = 0 ; i < this.thenHandlers.length ; i ++ )
	{
		let handler = this.thenHandlers[ i ] ;
		
		if ( handler.onFulfill )
		{
			if ( handler.promise )
			{
				try {
					handler.promise.resolve( handler.onFulfill( this.value ) ) ;
				}
				catch ( error_ ) {
					handler.promise.reject( error_ ) ;
				}
			}
			else
			{
				// Tap mode
				// Do not try-catch: we have nothing to do with the error
				handler.onFulfill( this.value ) ;
			}
		}
		else if ( handler.promise )
		{
			handler.promise.resolve( this.value ) ;
		}
	}
} ;



Promise.prototype.execRejectionHandlers = function execRejectionHandlers()
{
	// Do not cache the length, any handler can synchronously add one
	for ( let i = 0 ; i < this.thenHandlers.length ; i ++ )
	{
		let handler = this.thenHandlers[ i ] ;
		
		if ( handler.onReject )
		{
			if ( handler.promise )
			{
				try {
					handler.promise.resolve( handler.onReject( this.value ) ) ;
				}
				catch ( error_ ) {
					handler.promise.reject( error_ ) ;
				}
			}
			else
			{
				// Tap mode
				handler.onReject( this.value ) ;
			}
		}
		else if ( handler.promise )
		{
			handler.promise.reject( this.value ) ;
		}
	}
} ;



Promise.prototype.resolveTimeout = Promise.prototype.fulfillTimeout = function resolveTimeout( time , result )
{
	setTimeout( () => this.resolve( result ) , time ) ;
} ;



Promise.prototype.rejectTimeout = function rejectTimeout( time , error )
{
	setTimeout( () => this.reject( error ) , time ) ;
} ;



Promise.prototype.then = function then( onFulfill , onReject , tap )
{
	var handler , promise ;
	
	if ( ! onFulfill && ! onReject ) { return this ; }
	
	switch ( this.status )
	{
		case UNSTARTED :
			// If this is a dormant promise, wake it up now!
            if ( ! tap && this.fn )
            {
                this.exec() ;
                return this.then( onFulfill , onReject , tap ) ;
            }
            
			handler = {
				onFulfill: onFulfill ,
				onReject: onReject ,
				promise: ! tap && new Promise()
			} ;
			
			if ( ! this.thenHandlers ) { this.thenHandlers = [ handler ] ; }
			else { this.thenHandlers.push( handler ) ; }
			
			return tap ? this : handler.promise ;
		
		case PENDING :
			handler = {
				onFulfill: onFulfill ,
				onReject: onReject ,
				promise: ! tap && new Promise()
			} ;
			
			if ( ! this.thenHandlers ) { this.thenHandlers = [ handler ] ; }
			else { this.thenHandlers.push( handler ) ; }
			
			if ( ! tap ) { return handler.promise ; }
			
			return this ;
			
		case FULFILLED :
			
			if ( ! onFulfill ) { return this ; }
			
			promise = new Promise() ;
			
			// This handler should not fire in this code sync flow
			nextTick( () => {
				try {
					promise.resolve( onFulfill( this.value ) ) ;
				}
				catch ( error ) {
					promise.reject( error ) ;
				}
			} ) ;
			
			return tap ? this : promise ;
		
		case REJECTED :
			if ( ! onReject ) { return this ; }
			
			this.handledRejection = true ;
			promise = new Promise() ;
			
			// This handler should not fire in this code sync flow
			nextTick( () => {
				try {
					promise.resolve( onFulfill( this.value ) ) ;
				}
				catch ( error ) {
					promise.reject( error ) ;
				}
			} ) ;
	}
} ;



/*
	.then() short-hand.
*/
Promise.prototype.catch = function( onReject ) { return this.then( undefined , onReject ) ; } ;
Promise.prototype.tap = function( onFulfill ) { return this.then( onFulfill , undefined , true ) ; } ;
Promise.prototype.tapCatch = function( onReject ) { return this.then( undefined , onReject , true ) ; } ;
Promise.prototype.finally = function( onSettled ) { return this.then( onSettled , onSettled , true ) ; } ;



// Like .then(), but any uncatched error will throw, and does not return a promise
Promise.prototype.done = function ( onFulfill , onReject )
{
	var promise = this ;
	
	if ( onFulfill || onReject )
	{
		promise = this.then( onFulfill , onReject ) ;
	}
	
	promise.then( undefined , error => { throw error ; } ) ;
} ;



Promise.prototype.inspect = function inspect()
{
	switch ( this.status )
	{
		case UNSTARTED :
			return 'Promise { <UNSTARTED> }' ;
		case PENDING :
			return 'Promise { <PENDING> }' ;
		case FULFILLED :
			return 'Promise { <FULFILLED> ' + this.value + ' }' ;
		case REJECTED :
			return 'Promise { <REJECTED> ' + this.value + ' }' ;
	}
} ;



Promise.prototype.nodeify =
Promise.prototype.callbackify =
Promise.prototype.callback = function callback( cb )
{
	this.then(
		value => cb( undefined , value ) ,
		error => cb( error )
	) ;
	
	return this ;
} ;



Promise.prototype.nodeifyAll =
Promise.prototype.callbackifyAll =
Promise.prototype.callbackAll = function callbackAll( cb )
{
	this.then(
		values => {
			if ( Array.isArray( values ) ) { cb( undefined , ... values ) ; }
			else { cb( undefined , values ) ; }
		} ,
		error => cb( error )
	) ;
	
	return this ;
} ;



Promise.resolve = Promise.fulfill = function resolve( result )
{
	//if ( ( result instanceof Promise ) || ( result instanceof NativePromise ) ) { return result ; }
	if ( Promise.isThenable( result ) ) { return Promise.fromThenable( result ) ; }
	
	//return new Promise().resolve( result ) ;	// Canonical, but slightly slower
	
	// Faster: we don't need to check for thenHandlers, there isn't any!
	var promise = new Promise() ;
	promise.status = FULFILLED ;
	promise.value = result ;
	return promise ;
} ;



Promise.reject = function reject( error )
{
	return new Promise().reject( error ) ;
} ;



Promise.isThenable = function isThenable( value )
{
	return value && typeof value === 'object' && typeof value.then === 'function' ;
} ;



// We assume a thenable object here
Promise.fromThenable = function fromThenable( thenable )
{
	if ( thenable instanceof Promise ) { return thenable ; }
	
	return new Promise( ( resolve , reject ) => {
		thenable.then(
			value => resolve( value ) ,
			error => reject( error )
		) ;
	} ) ;
} ;



Promise.resolveTimeout = Promise.fulfillTimeout = function resolveTimeout( timeout , value )
{
	return new Promise( resolve => setTimeout( () => resolve( value ) , timeout ) ) ;
} ;



Promise.rejectTimeout = function rejectTimeout( timeout , error )
{
	return new Promise( ( resolve , reject ) => setTimeout( () => reject( error ) , timeout ) ) ;
} ;



/*
	A timeout that is greater if CPU-bound tasks are in progress.
*/
Promise.resolveBusyTimeout = function resolveBusyTimeout( timeout , value )
{
	return new Promise( resolve =>
		setTimeout(
			() => setTimeout(
				() => setTimeout(
					() => setTimeout(
						() => resolve( value ) ,
						0
					) , timeout / 2
				) , timeout / 2
			) , 0
		)
	) ;
} ;



// A dormant promise is activated the first time a then handler is assigned
Promise.dormant = function dormant( fn )
{
	var promise = new Promise() ;
	promise.fn = fn ;
	return promise ;
} ;



Promise.all = function all( iterable )
{
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		allPromise = new Promise() ;
	
	for ( value of iterable )
	{
		index ++ ;
		
		// Create a scope to keep track of the promise's own index
		( () => {		// jshint ignore:line
			const promiseIndex = index ;
			
			Promise.resolve( value )
			.then(
				value => {
					if ( settled ) { return ; }
					
					values[ promiseIndex ] = value ;
					count ++ ;
					
					if ( count >= length )
					{
						settled = true ;
						allPromise.resolve( values ) ;
					}
				} ,
				error => {
					if ( settled ) { return ; }
					settled = true ;
					allPromise.reject( error ) ;
				}
			) ;
		} )() ;
	}
	
	length = index + 1 ;
	
	if ( ! length )
	{
		allPromise.resolve( values ) ;
	}
	
	return allPromise ;
} ;



// Promise.all() with an iterator
Promise.every =
Promise.map = function map( iterable , iterator )
{
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		allPromise = new Promise() ;
	
	for ( value of iterable )
	{
		index ++ ;
		
		// Create a scope to keep track of the promise's own index
		( () => {		// jshint ignore:line
			const promiseIndex = index ;
			
			Promise.resolve( value )
			.then( value => {
				if ( settled ) { return ; }
				return iterator( value , promiseIndex ) ;
			} )
			.then(
				value => {
					if ( settled ) { return ; }
					
					values[ promiseIndex ] = value ;
					count ++ ;
					
					if ( count >= length )
					{
						settled = true ;
						allPromise.resolve( values ) ;
					}
				} ,
				error => {
					if ( settled ) { return ; }
					settled = true ;
					allPromise.reject( error ) ;
				}
			) ;
		} )() ;
	}
	
	length = index + 1 ;
	
	if ( ! length )
	{
		allPromise.resolve( values ) ;
	}
	
	return allPromise ;
} ;



/*
	It works symmetrically with Promise.all(), the resolve and reject logic are switched.
	Therefore, it resolves to the first resolving promise OR reject if all promises are rejected
	with, as a reason, the array of all promise rejection reasons.
*/
Promise.any = function any( iterable )
{
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value ,
		errors = [] ,
		anyPromise = new Promise() ;
	
	for ( value of iterable )
	{
		index ++ ;
		
		// Create a scope to keep track of the promise's own index
		( () => {		// jshint ignore:line
			const promiseIndex = index ;
			
			Promise.resolve( value )
			.then(
				value => {
					if ( settled ) { return ; }
					
					settled = true ;
					anyPromise.resolve( value ) ;
				} ,
				error => {
					if ( settled ) { return ; }
					
					errors[ promiseIndex ] = error ;
					count ++ ;
					
					if ( count >= length )
					{
						settled = true ;
						anyPromise.reject( errors ) ;
					}
				}
			) ;
		} )() ;
	}
	
	length = index + 1 ;
	
	if ( ! length )
	{
		anyPromise.reject( new RangeError( 'Promise.any(): empty array' ) ) ;
	}
	
	return anyPromise ;
} ;



// Like Promise.any() but with an iterator
Promise.some = function some( iterable , iterator )
{
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value ,
		errors = [] ,
		anyPromise = new Promise() ;
	
	for ( value of iterable )
	{
		index ++ ;
		
		// Create a scope to keep track of the promise's own index
		( () => {		// jshint ignore:line
			const promiseIndex = index ;
			
			Promise.resolve( value )
			.then( value => {
				if ( settled ) { return ; }
				return iterator( value , promiseIndex ) ;
			} )
			.then(
				value => {
					if ( settled ) { return ; }
					
					settled = true ;
					anyPromise.resolve( value ) ;
				} ,
				error => {
					if ( settled ) { return ; }
					
					errors[ promiseIndex ] = error ;
					count ++ ;
					
					if ( count >= length )
					{
						settled = true ;
						anyPromise.reject( errors ) ;
					}
				}
			) ;
		} )() ;
	}
	
	length = index + 1 ;
	
	if ( ! length )
	{
		anyPromise.reject( new RangeError( 'Promise.any(): empty array' ) ) ;
	}
	
	return anyPromise ;
} ;



/*
	More closed to Array#filter().
	The iterator should return truthy if the array element should be kept,
	or falsy if the element should be filtered out.
	Any rejection reject the whole promise.
*/
Promise.filter = function filter( iterable , iterator )
{
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		filterPromise = new Promise() ;
	
	for ( value of iterable )
	{
		index ++ ;
		
		// Create a scope to keep track of the promise's own index
		( () => {		// jshint ignore:line
			const promiseIndex = index ;
			
			Promise.resolve( value )
			.then( value => {
				if ( settled ) { return ; }
				values[ promiseIndex ] = value ;
				return iterator( value , promiseIndex ) ;
			} )
			.then(
				iteratorValue => {
					if ( settled ) { return ; }
					
					count ++ ;
					
					if ( ! iteratorValue ) { values[ promiseIndex ] = HOLE ; }
					
					if ( count >= length )
					{
						settled = true ;
						values = values.filter( e => e !== HOLE ) ;
						filterPromise.resolve( values ) ;
					}
				} ,
				error => {
					if ( settled ) { return ; }
					settled = true ;
					filterPromise.reject( error ) ;
				}
			) ;
		} )() ;
	}
	
	length = index + 1 ;
	
	if ( ! length )
	{
		filterPromise.resolve( values ) ;
	}
	else if ( count >= length )
	{
		settled = true ;
		values = values.filter( e => e !== HOLE ) ;
		filterPromise.resolve( values ) ;
	}
	
	return filterPromise ;
} ;



// forEach performs reduce as well, if a third argument is supplied
Promise.foreach =
Promise.forEach = function forEach( iterable , iterator , accumulator )
{
	var index = -1 ,
		isReduce = arguments.length >= 3 ,
		it = iterable[Symbol.iterator]() ,
		forEachPromise = new Promise() ,
		lastPromise = new Promise.resolve( accumulator ) ;
	
	if ( Promise.warnUnhandledRejection ) { Promise._handleAll( iterable ) ; }
	
	var nextElement = () => {
		lastPromise.then(
			( accumulator ) => {
				let { value , done } = it.next() ;
				index ++ ;
				
				if ( done )
				{
					forEachPromise.resolve( accumulator ) ;
				}
				else
				{
					lastPromise = Promise.resolve( value ).then(
						isReduce ?
							value => iterator( accumulator , value , index ) :
							value => iterator( value , index )
					) ;
					
					nextElement() ;
				}
			} ,
			( error ) => {
				forEachPromise.reject( error ) ;
				
				// We have to eat all remaining promise errors
				while ( true )
				{
					let { value , done } = it.next() ;
					if ( done ) { break ; }
					
					//if ( ( value instanceof Promise ) || ( value instanceof NativePromise ) )
					if ( Promise.isThenable( value ) )
					{
						value.then( noop , noop ) ;
					}
				}
			}
		) ;
	} ;
	
	nextElement() ;
	
	return forEachPromise ;
} ;



Promise.reduce = function reduce( iterable , iterator , accumulator )
{
	// Force 3 arguments
	return Promise.forEach( iterable , iterator , accumulator ) ;
} ;



/*
	Same than map, but iterate over an object and produce and object.
	Think of it as a kind of Object#map() (which of course does not exist).
*/
Promise.mapObject = function mapObject( inputObject , iterator )
{
	var settled = false ,
		count = 0 ,
		i , key , keys = Object.keys( inputObject ) ,
		length = keys.length ,
		value , outputObject = {} ,
		mapPromise = new Promise() ;
	
	for ( i = 0 ; i < length ; i ++ )
	{
		key = keys[ i ] ;
		value = inputObject[ key ] ;
		
		// Create a scope to keep track of the promise's own key
		( () => {		// jshint ignore:line
			const promiseKey = key ;
			
			Promise.resolve( value )
			.then( value => {
				if ( settled ) { return ; }
				return iterator( value , promiseKey ) ;
			} )
			.then( value => {
				if ( settled ) { return ; }
				
				outputObject[ promiseKey ] = value ;
				count ++ ;
				
				if ( count >= length )
				{
					settled = true ;
					mapPromise.resolve( outputObject ) ;
				}
			} )
			.catch( error => {
				if ( settled ) { return ; }
				settled = true ;
				mapPromise.reject( error ) ;
			} ) ;
		} )() ;
	}
	
	if ( ! length )
	{
		mapPromise.resolve( outputObject ) ;
	}
	
	return mapPromise ;
} ;



/*
	The standard method is totally stoOpid, since it rejects if the first settled promise rejects,
	it also hang forever on empty array.
	The standard guys should have been drunk.
	I don't want to code such a brain-fucking method.
	
	Use Promise.any() or Promise.filter()
*/
Promise.race = NativePromise.race.bind( NativePromise ) ;



/*
	Internal usage, mark all promises as handled ahead of time, useful for series,
	because a warning would be displayed for unhandled rejection for promises that are not yet processed.
*/
Promise._handleAll = function _handleAll( iterable )
{
	var value ;
	
	for ( value of iterable )
	{
		//if ( ( value instanceof Promise ) || ( value instanceof NativePromise ) )
		if ( Promise.isThenable( value ) )
		{
			value.handledRejection = true ;
		}
	}
} ;



Promise.prototype.unhandledRejection = function unhandledRejection()
{
	// This promise is currently unhandled
	// If still unhandled at the end of the synchronous block of code,
	// output an error message.
	
	this.handledRejection = false ;
	
	// Don't know what is the correct way to inform node.js about that.
	// There is no doc about that, and emitting unhandledRejection
	// does not produce what is expected.
	
	//process.emit( 'unhandledRejection' , this.value , this ) ;
	
	/*
	nextTick( () => {
		if ( this.handledRejection === false )
		{
			process.emit( 'unhandledRejection' , this.value , this ) ;
		}
	} ) ;
	*/
	
	//*
	if ( this.value instanceof Error )
	{
		nextTick( () => {
			if ( this.handledRejection === false )
			{
				this.value.message = 'Unhandled promise rejection: ' + this.value.message ;
				console.error( this.value ) ;
			}
		} ) ;
	}
	else
	{
		// Avoid starting the stack trace in the nextTick()...
		let error_ = new Error( 'Unhandled promise rejection' ) ;
		nextTick( () => {
			if ( this.handledRejection === false )
			{
				console.error( error_ ) ;
				console.error( 'Rejection reason:' , this.value ) ;
			}
		} ) ;
	}
	//*/
} ;


