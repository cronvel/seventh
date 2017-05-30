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



var decorators = require( './decorators.js' ) ;



exports.promisifyNodeApi = ( api , suffix , filter ) => {
	
	suffix = suffix || 'Async' ;
	filter = filter || ( key => key[ 0 ] !== '_' ) ;
	
	Object.keys( api )
	.filter( key => {
		if ( typeof api[ key ] !== 'function' ) { return false ; }
		
		// If it has enumerable properties on its prototype, it's a constructor
		for ( let trash in api[ key ].prototype ) { return false ; }	// jshint ignore:line
		
		return filter( key , api ) ;
	} )
	.forEach( key => {
		const targetKey = key + suffix ;
		
		// Do nothing if it already exists
		if ( api[ targetKey ] ) { return ; }
		
		api[ targetKey ] = decorators.promisifyNodeFn( api[ key ] ) ;
	} ) ;
} ;

