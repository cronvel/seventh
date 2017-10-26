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

// States
const UNSTARTED = 0 ;
const PENDING = STARTED_BIT ;
const FULFILLED = STARTED_BIT | SETTLED_BIT | FULFILLED_BIT ;
const REJECTED = STARTED_BIT | SETTLED_BIT | REJECTED_BIT ;



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
	
	if ( this.fn ) { this._exec() ; }
}

module.exports = Promise ;



Promise.Native = NativePromise ;
Promise.warnUnhandledRejection = true ;



Promise.prototype._exec = function _exec()
{
	//if ( this.status !== UNSTARTED ) { return ; }	// Not needed: always called internally when the status is UNSTARTED
	this.status = PENDING ;
	//this._execFn() ;
	
	try {
		this.fn(
			result_ => this.resolve( result_ ) ,
			error_ => this.reject( error_ )
		) ;
	}
	catch ( error ) {
		this.reject( error ) ;
	}
} ;



// Faster on node v8.x?
/*
Promise.prototype._execFn = function _execFn()
{
	try {
		this.fn(
			result_ => this.resolve( result_ ) ,
			error_ => this.reject( error_ )
		) ;
	}
	catch ( error ) {
		this.reject( error ) ;
	}
} ;
//*/



Promise.prototype.resolve = Promise.prototype.fulfill = function resolve( value )
{
	// Throw an error?
	if ( this.status & SETTLED_BIT ) { return this ; }
	
	if ( Promise.isThenable( value ) )
	{
		this._execThenPromise( value ) ;
		return this ;
	}
	else
	{
		return this._resolveValue( value ) ;
	}
} ;



Promise.prototype._resolveValue = function _resolveValue( value )
{
	//if ( this.status & SETTLED_BIT ) { return this ; }	// internal, so it's ok
	
	this.status = FULFILLED ;
	this.value = value ;
	if ( this.thenHandlers && this.thenHandlers.length ) { this._execFulfillHandlers() ; }
	
	return this ;
} ;



// Faster on node v8.x
Promise.prototype._execThenPromise = function _execThenPromise( thenPromise )
{
	try {
		thenPromise.then(
			result_ => { this.resolve( result_ ) ; } ,
			error_ => { this.reject( error_ ) ; }
		) ;
	}
	catch ( error ) {
		this.reject( error ) ;
	}
} ;



Promise.prototype.reject = function reject( error )
{
	// Throw an error?
	if ( this.status & SETTLED_BIT ) { return this ; }
	
	this.status = REJECTED ;
	this.value = error ;
	
	if ( this.thenHandlers && this.thenHandlers.length )
	{
		this._execRejectionHandlers() ;
	}
	else if ( Promise.warnUnhandledRejection && ! this.handledRejection )
	{
		this._unhandledRejection() ;
	}
	
	return this ;
} ;



Promise.prototype._execFulfillHandlers = function _execFulfillHandlers()
{
	var i , handler ,
		length = this.thenHandlers.length ;
	
	// Do cache the length, if a handler is synchronously added, it will be called on next tick
	for ( i = 0 ; i < length ; i ++ )
	{
		handler = this.thenHandlers[ i ] ;
		
		if ( handler.onFulfill )
		{
			if ( handler.promise )
			{
				this._execOneFulfillHandler( handler ) ;
				/*
				try {
					handler.promise.resolve( handler.onFulfill( this.value ) ) ;
				}
				catch ( error_ ) {
					handler.promise.reject( error_ ) ;
				}
				//*/
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



// Faster on node v8.x?
//*
Promise.prototype._execOneFulfillHandler = function _execOneFulfillHandler( handler )
{
	try {
		handler.promise.resolve( handler.onFulfill( this.value ) ) ;
	}
	catch ( error_ ) {
		if ( handler.dontCatch ) { throw error_ ; }
		handler.promise.reject( error_ ) ;
	}
} ;
//*/



Promise.prototype._execRejectionHandlers = function _execRejectionHandlers()
{
	var i , handler ,
		length = this.thenHandlers.length ;
	
	// Do cache the length, if a handler is synchronously added, it will be called on next tick
	for ( i = 0 ; i < length ; i ++ )
	{
		handler = this.thenHandlers[ i ] ;
		
		if ( handler.onReject )
		{
			if ( handler.promise )
			{
				this._execOneRejectHandler( handler ) ;
				/*
				try {
					handler.promise.resolve( handler.onReject( this.value ) ) ;
				}
				catch ( error_ ) {
					handler.promise.reject( error_ ) ;
				}
				//*/
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



// Faster on node v8.x?
//*
Promise.prototype._execOneRejectHandler = function _execOneRejectHandler( handler )
{
	try {
		handler.promise.resolve( handler.onReject( this.value ) ) ;
	}
	catch ( error_ ) {
		if ( handler.dontCatch ) { throw error_ ; }
		handler.promise.reject( error_ ) ;
	}
} ;
//*/



Promise.prototype.resolveTimeout = Promise.prototype.fulfillTimeout = function resolveTimeout( time , result )
{
	setTimeout( () => this.resolve( result ) , time ) ;
} ;



Promise.prototype.rejectTimeout = function rejectTimeout( time , error )
{
	setTimeout( () => this.reject( error ) , time ) ;
} ;



Promise.prototype.then = function then( onFulfill , onReject , tap , dontCatch )
{
	var handler , promise ;
	
	// Too defensive.
	//if ( ! onFulfill && ! onReject ) { return this ; }
	
	switch ( this.status )
	{
		case PENDING :
			handler = {
				onFulfill: onFulfill ,
				onReject: onReject ,
				dontCatch: !! dontCatch ,
				promise: ! tap && new Promise()
			} ;
			
			if ( ! this.thenHandlers ) { this.thenHandlers = [ handler ] ; }
			else { this.thenHandlers.push( handler ) ; }
			
			return tap ? this : handler.promise ;
			
		case FULFILLED :
			
			if ( ! onFulfill ) { return this ; }
			
			promise = new Promise() ;
			
			// This handler should not fire in this code sync flow
			nextTick( () => {
				try {
					promise.resolve( onFulfill( this.value ) ) ;
				}
				catch ( error ) {
					if ( handler.dontCatch ) { throw error_ ; }
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
					promise.resolve( onReject( this.value ) ) ;
				}
				catch ( error ) {
					if ( handler.dontCatch ) { throw error_ ; }
					promise.reject( error ) ;
				}
			} ) ;
			
			return tap ? this : promise ;
		
		case UNSTARTED :
			// If this is a dormant promise, wake it up now!
            if ( ! tap && this.fn )
            {
                this._exec() ;
                return this.then( onFulfill , onReject , tap , dontCatch ) ;
            }
            
			handler = {
				onFulfill: onFulfill ,
				onReject: onReject ,
				dontCatch: !! dontCatch ,
				promise: ! tap && new Promise()
			} ;
			
			if ( ! this.thenHandlers ) { this.thenHandlers = [ handler ] ; }
			else { this.thenHandlers.push( handler ) ; }
			
			return tap ? this : handler.promise ;
	}
} ;



/*
	.then() short-hand.
*/
Promise.prototype.catch = function( onReject ) { return this.then( undefined , onReject ) ; } ;
Promise.prototype.tap = function( onFulfill ) { return this.then( onFulfill , undefined , true ) ; } ;
Promise.prototype.tapCatch = function( onReject ) { return this.then( undefined , onReject , true ) ; } ;
Promise.prototype.finally = function( onSettled ) { return this.then( onSettled , onSettled , true ) ; } ;
Promise.prototype.done = function ( onFulfill , onReject ) { return this.then( onSettled , onReject , true , true ) ; } ;



Promise.prototype.getStatus = function getStatus()
{
	switch ( this.status )
	{
		case UNSTARTED :
			return 'dormant' ;
		case PENDING :
			return 'pending' ;
		case FULFILLED :
			return 'fulfilled' ;
		case REJECTED :
			return 'rejected' ;
	}
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



Promise.prototype.callback = function callback( cb )
{
	this.then(
		value => cb( undefined , value ) ,
		error => cb( error ) ,
		true ,
		true
	) ;
	
	return this ;
} ;



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



Promise.resolve = Promise.fulfill = function resolve( value )
{
	if ( Promise.isThenable( value ) ) { return Promise.fromThenable( value ) ; }
	return Promise._resolveValue( value ) ;
} ;



Promise._resolveValue = function _resolveValue( value )
{
	var promise = new Promise() ;
	promise.status = FULFILLED ;
	promise.value = value ;
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
			value => { resolve( value ) ; } ,
			error => { reject( error ) ; }
		) ;
	} ) ;
} ;



// When you just want a fast then() function out of anything, without any desync and unchainable
Promise._bareThen = function _bareThen( value , onFulfill , onReject )
{
	//if ( Promise.isThenable( value ) )
	if( value && typeof value === 'object' )
	{
		if ( value instanceof Promise )
		{
			if ( value.status === FULFILLED ) { onFulfill( value.value ) ; }
			else if ( value.status === REJECTED ) { onReject( value.value ) ; }
			else { value.then( onFulfill , onReject ) ; }
		}
		else if ( typeof value.then === 'function' )
		{
			value.then( onFulfill , onReject ) ;
		}
		else
		{
			onFulfill( value ) ;
		}
	}
	else
	{
		onFulfill( value ) ;
	}
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



Promise.prototype._unhandledRejection = function _unhandledRejection()
{
	// This promise is currently unhandled
	// If still unhandled at the end of the synchronous block of code,
	// output an error message.
	
	this.handledRejection = false ;
	
	// Don't know what is the correct way to inform node.js about that.
	// There is no doc about that, and emitting unhandledRejection,
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

