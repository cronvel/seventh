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

const PENDING = 0 ;
const FULFILLED = 1 ;
const REJECTED = 2 ;



function Promise( fn )
{
	this.fn = fn ;
	this.status = PENDING ;
	this.value = undefined ;
	this.thenHandlers = undefined ;
	
	if ( this.fn )
	{
		this.run() ;
	}
}

module.exports = Promise ;

//const seventh = require( './seventh.js' ) ;



Promise.prototype.run = function run()
{
	this.fn( ... this._buildCallbacks() ) ;
} ;



Promise.prototype.fulfill = function fulfill( result )
{
	if ( ( result instanceof Promise ) || ( result instanceof NativePromise ) )
	{
		// Build new callbacks with an independant 'triggered' var
		result.then( ... this._buildCallbacks() ) ;
	}
	else
	{
		this.status = FULFILLED ;
		this.value = result ;
		
		if ( this.thenHandlers )
		{
			// Do not cache the length, any handler can synchronously add one
			for ( let i = 0 ; i < this.thenHandlers.length ; i ++ )
			{
				let handler = this.thenHandlers[ i ] ;
				
				if ( handler.onFulfill )
				{
					handler.promise.fulfill( handler.onFulfill( result ) ) ;
				}
				else
				{
					handler.promise.fulfill( result ) ;
				}
			}
		}
	}
} ;



Promise.prototype.reject = function reject( error )
{
	this.status = REJECTED ;
	this.value = error ;
	
	if ( this.thenHandlers )
	{
		// Do not cache the length, any handler can synchronously add one
		for ( let i = 0 ; i < this.thenHandlers.length ; i ++ )
		{
			let handler = this.thenHandlers[ i ] ;
			
			if ( handler.onReject )
			{
				handler.promise.fulfill( handler.onReject( error ) ) ;
			}
			else
			{
				handler.promise.reject( error ) ;
			}
		}
	}
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



Promise.prototype.catch = function _catch( onReject )
{
	return this.then( undefined , onReject ) ;
} ;



Promise.all = function all( promises )
{
	var count = promises.length ,
		settled = false ,
		allPromise = new Promise() ;
	
	promises.forEach( promise => {
		promise.then(
			() => {
				if ( ! -- count && ! settled ) { settled = true ; allPromise.fulfill() ; }
			} ,
			( error ) => {
				if ( ! settled ) { settled = true ; allPromise.reject( error ) ; }
			}
		) ;
	} ) ;
	
	return allPromise ;
} ;



Promise.prototype.inspect = function inspect()
{
	switch ( this.status )
	{
		case PENDING :
			return 'Promise { <PENDING> }' ;
		case FULFILLED :
			return 'Promise { <FULFILLED> }' ;
		case REJECTED :
			return 'Promise { <REJECTED> }' ;
	}
} ;


