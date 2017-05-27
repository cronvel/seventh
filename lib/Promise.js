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



function Promise( fn )
{
	this.fn = fn ;
	this.status = UNSTARTED ;
	this.value = undefined ;
	this.thenHandlers = undefined ;
	
	if ( this.fn ) { this.exec() ; }
}

module.exports = Promise ;

//const seventh = require( './seventh.js' ) ;



Promise.prototype.executor = function executor( fn )
{
	if ( ! this.fn ) { this.fn = fn ; }
} ;



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



Promise.prototype.resolve = Promise.prototype.fulfill = function fulfill( result )
{
	// Throw an error?
	if ( ( this.status & SETTLED_MASK ) === SETTLED_MASK ) { return this ; }
	
	if ( ( result instanceof Promise ) || ( result instanceof NativePromise ) )
	{
		// Build new callbacks with an independant 'triggered' var
		result.then( ... this._buildCallbacks() ) ;
	}
	else
	{
		this.status = FULFILLED ;
		this.value = result ;
		
		if ( this.thenHandlers && this.thenHandlers.length )
		{
			// Do not cache the length, any handler can synchronously add one
			for ( let i = 0 ; i < this.thenHandlers.length ; i ++ )
			{
				let handler = this.thenHandlers[ i ] ;
				
				if ( handler.onFulfill )
				{
					try {
						handler.promise.fulfill( handler.onFulfill( result ) ) ;
					}
					catch ( error_ ) {
						handler.promise.reject( error_ ) ;
					}
				}
				else
				{
					handler.promise.fulfill( result ) ;
				}
			}
		}
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
		// Do not cache the length, any handler can synchronously add one
		for ( let i = 0 ; i < this.thenHandlers.length ; i ++ )
		{
			let handler = this.thenHandlers[ i ] ;
			
			if ( handler.onReject )
			{
				try {
					handler.promise.fulfill( handler.onReject( error ) ) ;
				}
				catch ( error_ ) {
					handler.promise.reject( error_ ) ;
				}
			}
			else
			{
				handler.promise.reject( error ) ;
			}
		}
	}
	/*
	else
	{
		// /!\ Should it be process.nextTick()'ed?
		throw new Error( 'Unhandled promise rejection' ) ;
	}
	*/
	
	return this ;
} ;



Promise.prototype._buildCallbacks = function _buildCallbacks()
{
	var triggered = false ;
	
	return [
		
		// Fulfill callback
		( result ) => {
			if ( triggered ) { return ; }
			triggered = true ;
			this.fulfill( result ) ;
		} ,
		
		// Reject callback
		( error ) => {
			if ( triggered ) { return ; }
			triggered = true ;
			this.reject( error ) ;
		}
	] ;
} ;



Promise.prototype.then = function then( onFulfill , onReject )
{
	var result ;
	
	if ( ! onFulfill && ! onReject ) { return this ; }
	
	switch ( this.status )
	{
		case UNSTARTED :
		case PENDING :
			
			var handler = {
				onFulfill: onFulfill ,
				onReject: onReject ,
				promise: new Promise()
			} ;
			
			if ( ! this.thenHandlers ) { this.thenHandlers = [ handler ] ; }
			else { this.thenHandlers.push( handler ) ; }
			
			return handler.promise ;
			
		case FULFILLED :
			if ( onFulfill )
			{
				result = onFulfill( this.value ) ;
				
				if ( ( result instanceof Promise ) || ( result instanceof NativePromise ) )
				{
					return result ;
				}
			}
			
			return this ;
		
		case REJECTED :
			if ( onReject )
			{
				result = onReject( this.value ) ;
				
				if ( ( result instanceof Promise ) || ( result instanceof NativePromise ) )
				{
					return result ;
				}
			}
			
			return this ;
	}
} ;



// Like .then( undefined , onReject )
Promise.prototype.catch = function _catch( onReject )
{
	return this.then( undefined , onReject ) ;
} ;



// Like .then( onSettled , onSettled )
Promise.prototype.finally = function _finally( onSettled )
{
	return this.then( onSettled , onSettled ) ;
} ;



Promise.resolve = Promise.fulfill = function fulfill( value )
{
	return new Promise().resolve( value ) ;
} ;



Promise.reject = function reject( error )
{
	return new Promise().reject( error ) ;
} ;



Promise.all = function all( promises )
{
	var index = -1 , settled = false ,
		count = promises.length ,
		onePromise ,
		values = [] ,
		allPromise = new Promise() ;
	
	for ( onePromise of promises )
	{
		index ++ ;
		
		// Can be settled (rejected) synchronously
		if ( settled ) { break ; }
		
		// Direct value?
		if ( ! ( onePromise instanceof Promise ) && ! ( onePromise instanceof NativePromise ) )
		{
			values[ index ] = onePromise ;
			
			if ( ! -- count )
			{
				settled = true ;
				allPromise.fulfill( values ) ;
				break ;
			}
			
			continue ;
		}
		
		// Create a scope to keep track of the promise's own index
		(() => {		// jshint ignore:line
			const promiseIndex = index ;
			
			onePromise.then(
				( value ) => {
					if ( ! settled )
					{
						values[ promiseIndex ] = value ;
						
						if ( ! -- count )
						{
							settled = true ;
							allPromise.fulfill( values ) ;
						}
					}
				} ,
				( error ) => {
					if ( ! settled )
					{
						settled = true ;
						allPromise.reject( error ) ;
					}
				}
			) ;
		})() ;
	}
	
	if ( index < 0 ) { allPromise.fullfill( values ) ; }
	
	return allPromise ;
} ;



/*
	The standard method is totally stoOpid, since it rejects if the first settled promise rejects,
	it also hang forever on empty array.
	The standard guys should have been drunk.
	I don't want to code such a brain-fucking method.
*/
Promise.race = NativePromise.race.bind( NativePromise ) ;



// This works like Promise.race() should
Promise.any = function any( promises )
{
	var empty = true , settled = false ,
		count = promises.length ,
		onePromise ,
		anyPromise = new Promise() ;
	
	for ( onePromise of promises )
	{
		empty = false ;
		
		// Can be settled synchronously
		if ( settled ) { break ; }
		
		// Direct value?
		if ( ! ( onePromise instanceof Promise ) && ! ( onePromise instanceof NativePromise ) )
		{
			settled = true ;
			anyPromise.fulfill( onePromise ) ;
			break ;
		}
		
		onePromise.then(
			( value ) => {		// jshint ignore:line
				if ( ! settled )
				{
					settled = true ;
					anyPromise.fulfill( value ) ;
				}
			} ,
			( error ) => {		// jshint ignore:line
				if ( ! -- count && ! settled )
				{
					settled = true ;
					anyPromise.reject( error ) ;
				}
			}
		) ;
	}
	
	if ( empty ) { anyPromise.reject( new RangeError( 'Promise.any(): empty array' ) ) ; }
	
	return anyPromise ;
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


