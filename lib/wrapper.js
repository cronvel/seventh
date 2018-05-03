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



Promise.timeLimit = ( timeout , asyncFn ) => {
	return new Promise( ( resolve , reject ) => {
		asyncFn().then( resolve , reject ) ;
		setTimeout( () => reject( new Error( "Timeout" ) ) , timeout ) ;
	} ) ;
} ;



Promise.retry = ( options , asyncFn ) => {
	var count = options.retries || 1 ,
		timeout = options.timeout || 0 ,	// time before assuming it has failed, 0 = no time limit
		coolDown = options.coolDown || 0 ,	// time before retrying
		factor = options.factor || 1 ,	// multiplier for the cool down
		catchFn = options.catch || null ;

	const oneTry = () => {
		return ( timeout ? Promise.timeLimit( timeout , asyncFn ) : asyncFn() ).catch( error => {
			if ( ! count -- ) { throw error ; }

			var nextCoolDown = coolDown ;
			coolDown *= factor ;

			if ( catchFn ) {
				// Call the custom catch function
				return Promise.resolve( catchFn( error ) ).then( () => Promise.resolveTimeout( nextCoolDown ).then( oneTry ) ) ;
			}

			return Promise.resolveTimeout( nextCoolDown ).then( oneTry ) ;
		} ) ;
	} ;

	return oneTry() ;
} ;

