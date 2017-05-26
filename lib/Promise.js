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



const PENDING = 0 ;
const RESOLVED = 1 ;
const REJECTED = 2 ;



function Promise( fn )
{
	this.status = PENDING ;
	this.fn = fn ;
	this.value = undefined ;
	this.onResolveHandlers = undefined ;
	this.onRejectHandlers = undefined ;
	this.run() ;
}

module.exports = Promise ;



Promise.prototype.run = function run()
{
	this.fn( ... this.buildCallbacks() ) ;
} ;



Promise.prototype.buildCallbacks = function buildCallbacks()
{
	var triggered = false ;
	
	return [
		
		// Resolve callback
		( result ) => {
			if ( triggered ) { return ; }
			
			triggered = true ;
			
			if ( result instanceof Promise )
			{
				// Build new callbacks with an independant 'triggered' var
				result.then( ... this.buildCallbacks() ) ;
			}
			else
			{
				this.value = result ;
				
				if ( ! this.onResolveHandlers ) { return ; }
				
				// Do not cache the length, any handler can synchronously add one
				for ( let i = 0 ; i < this.onResolveHandlers.length ; i ++ )
				{
					this.onResolveHandlers[ i ]( result ) ;
				}
			}
		} ,
		
		// Reject callback
		( error ) => {
			if ( triggered ) { return ; }
			
			triggered = true ;
			this.value = error ;
			
			if ( ! this.onRejectHandlers ) { return ; }
			
			// Do not cache the length, any handler can synchronously add one
			for ( let i = 0 ; i < this.onRejectHandlers.length ; i ++ )
			{
				this.onRejectHandlers[ i ]( error ) ;
			}
		}
	] ;
} ;



Promise.prototype.then = function then( onResolve , onReject )
{
	if ( onReject ) { this.catch( onReject ) ; }
	if ( ! onResolve ) { return ; }
	
	switch ( this.status )
	{
		case PENDING :
			if ( ! this.onResolveHandlers ) { this.onResolveHandlers = [ onResolve ] ; }
			else { this.onResolveHandlers.push( onResolve ) ; }
			return ;
			
		case RESOLVED :
			onResolve( this.value ) ;
			return ;
	}
} ;



Promise.prototype.catch = function _catch( onReject )
{
	switch ( this.status )
	{
		case PENDING :
			if ( ! this.onRejectHandlers ) { this.onRejectHandlers = [ onReject ] ; }
			else { this.onRejectHandlers.push( onReject ) ; }
			return ;
			
		case REJECTED :
			onReject( this.value ) ;
			return ;
	}
} ;

