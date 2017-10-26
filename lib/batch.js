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



var Promise = require( './seventh.js' ) ;



// This object is used as a special unique value for array hole (see Promise.filter())
const HOLE = {} ;

function noop() {}



Promise.all = function all( iterable )
{
	var index = -1 , settled = false ,
		count = 0 , length = Infinity ,
		value , values = [] ,
		allPromise = new Promise() ;
	
	for ( value of iterable )
	{
		if ( settled ) { break ; }
		
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
						allPromise._resolveValue( values ) ;
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
		allPromise._resolveValue( values ) ;
	}
	
	return allPromise ;
} ;



// Maybe faster, but can't find any reasonable grounds for that ATM
Promise._all = function _allArray( iterable )
{
	var length = iterable.length ;
	
	if ( ! length ) { Promise._resolveValue( [] ) ; }
	
	var index ,
		runtime = {
			settled: false ,
			count: 0 ,
			length: length ,
			values: [] ,
			allPromise: new Promise()
		} ;
	
	for ( index = 0 ; ! runtime.settled && index < length ; index ++ )
	{
		Promise._allOne( iterable[ index ] , index , runtime ) ;
	}
	
	return runtime.allPromise ;
} ;



// internal for allArray
Promise._allArrayOne = function _allArrayOne( value , index , runtime )
{	
	Promise._bareThen( value ,
		value_ => {
			if ( runtime.settled ) { return ; }
			
			runtime.values[ index ] = value_ ;
			runtime.count ++ ;
			
			if ( runtime.count >= runtime.length )
			{
				runtime.settled = true ;
				runtime.allPromise._resolveValue( runtime.values ) ;
			}
		} ,
		error => {
			if ( runtime.settled ) { return ; }
			runtime.settled = true ;
			runtime.allPromise.reject( error ) ;
		}
	) ;
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
		if ( settled ) { break ; }
		
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
						allPromise._resolveValue( values ) ;
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
		allPromise._resolveValue( values ) ;
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
		if ( settled ) { break ; }
		
		index ++ ;
		
		// Create a scope to keep track of the promise's own index
		( () => {		// jshint ignore:line
			const promiseIndex = index ;
			
			Promise.resolve( value )
			.then(
				value => {
					if ( settled ) { return ; }
					
					settled = true ;
					anyPromise._resolveValue( value ) ;
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
		if ( settled ) { break ; }
		
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
					anyPromise._resolveValue( value ) ;
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
		if ( settled ) { break ; }
		
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
						filterPromise._resolveValue( values ) ;
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
		filterPromise._resolveValue( values ) ;
	}
	else if ( count >= length )
	{
		settled = true ;
		values = values.filter( e => e !== HOLE ) ;
		filterPromise._resolveValue( values ) ;
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
		lastPromise = Promise.resolve( accumulator ) ;
	
	if ( Promise.warnUnhandledRejection ) { Promise._handleAll( iterable ) ; }
	
	var nextElement = () => {
		lastPromise.then(
			accumulator => {
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
			error => {
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
	
	for ( i = 0 ; ! settled && i < length ; i ++ )
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
			.then(
				value => {
					if ( settled ) { return ; }
					
					outputObject[ promiseKey ] = value ;
					count ++ ;
					
					if ( count >= length )
					{
						settled = true ;
						mapPromise._resolveValue( outputObject ) ;
					}
				} ,
				error => {
					if ( settled ) { return ; }
					settled = true ;
					mapPromise.reject( error ) ;
				}
			) ;
		} )() ;
	}
	
	if ( ! length )
	{
		mapPromise._resolveValue( outputObject ) ;
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
Promise.race = Promise.Native.race.bind( Promise.Native ) ;

