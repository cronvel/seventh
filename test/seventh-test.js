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



/* jshint unused:false */
/* global describe, it, before, after, beforeEach */


var seventh = require( '..' ) ;
var expect = require( 'expect.js' ) ;



			/* Tests */



describe( "Basic standard-compliant Promise" , function() {
	
	it( "edge case: synchronous throwing should still trigger .catch() asynchronously" , done => {
		
		var order = [] ;
		
		var p = new seventh.Promise( ( resolve , reject ) => {
			throw new Error( 'Error!' ) ;
		} ) ;
		
		p.catch( () => order.push( 'catch' ) ) ;
		
		order.push( 'sync after' ) ;
		
		p.then(
			() => done( new Error( 'Should throw!' ) ) ,
			() => {
				expect( order ).to.eql( [ 'sync after' , 'catch' ] ) ;
				done()
			}
		).catch( error => done( error || new Error() ) ) ;
	} ) ;
} ) ;



describe( "Wrappers and decorators" , function() {
	
	it( "return value interceptor -- .returnValueInterceptor()" , () => {
		var index = 0 ;
		var returnArray = [ 'one' , 'two' , 'three' ] ;
		var results = [] ;
		
		const fn = () => {
			return returnArray[ index ++ ] ;
		} ;
		
		const interceptorFn = value => {
			results.push( value ) ;
		} ;
		
		const interceptableFn = seventh.returnValueInterceptor( interceptorFn , fn ) ;
		
		interceptableFn() ;
		interceptableFn() ;
		interceptableFn() ;
		
		expect( results ).to.eql( returnArray ) ;
	} ) ;
	
	
	
	it( "run once -- .once()" , done => {
		var results = [] ;
		
		const asyncFn = ( value ) => {
			results.push( value ) ;
			var p = seventh.Promise.resolveTimeout( 20 , value ) ;
			return p ;
		} ;
		
		const onceFn = seventh.once( asyncFn ) ;
		
		onceFn( 'one' ) ;
		onceFn( 'two' ) ;
		onceFn( 'three' ) ;
		onceFn( 'four' ) ;
		
		setTimeout( () => {
			onceFn( 'five' ).then( () => {
				//console.log( results ) ;
				expect( results ).to.eql( ['one'] ) ;
				done() ;
			} ).catch( error => done( error ) ) ;
		} , 40 ) ;
	} ) ;
	
	
	
	it( "debounce -- .debounce()" , done => {
		var results = [] ;
		
		const asyncFn = ( value ) => {
			results.push( value ) ;
			var p = seventh.Promise.resolveTimeout( 20 , value ) ;
			return p ;
		} ;
		
		const debouncedFn = seventh.debounce( asyncFn ) ;
		
		debouncedFn( 'one' ) ;
		debouncedFn( 'two' ) ;
		debouncedFn( 'three' ) ;
		debouncedFn( 'four' ) ;
		
		setTimeout( () => {
			debouncedFn( 'five' ).then( () => {
				//console.log( results ) ;
				expect( results ).to.eql( ['one','five'] ) ;
				done() ;
			} ).catch( error => done( error ) ) ;
		} , 40 ) ;
	} ) ;
	
	
	
	it( "debounce update -- .debounceUpdate()" , done => {
		var results = [] ;
		
		const asyncFn = ( value ) => {
			results.push( value ) ;
			var p = seventh.Promise.resolveTimeout( 20 , value ) ;
			return p ;
		} ;
		
		const debouncedFn = seventh.debounceUpdate( asyncFn ) ;
		
		debouncedFn( 'one' ) ;
		debouncedFn( 'two' ) ;
		debouncedFn( 'three' ) ;
		debouncedFn( 'four' ) ;
		
		setTimeout( () => {
			debouncedFn( 'five' ).then( () => {
				//console.log( results ) ;
				expect( results ).to.eql( ['one','four','five'] ) ;
				done() ;
			} ).catch( error => done( error ) ) ;
		} , 40 ) ;
	} ) ;
	
	
	
	it( "serialize, execution do not overlap -- .serialize()" , done => {
		var results = [] ;
		
		const asyncFn = ( value ) => {
			results.push( 'before: ' + value ) ;
			
			var p = new seventh.Promise( resolve => {
				setTimeout( () => {
					results.push( 'after: ' + value ) ;
					resolve() ;
				} , 20 ) ;
			} ) ;
			
			return p ;
		} ;
		
		const serializedFn = seventh.serialize( asyncFn ) ;
		
		serializedFn( 'one' ) ;
		serializedFn( 'two' ) ;
		serializedFn( 'three' ) ;
		serializedFn( 'four' ) ;
		
		setTimeout( () => {
			serializedFn( 'five' ).then( () => {
				//console.log( results ) ;
				expect( results ).to.eql( [
					"before: one" ,
					"after: one" ,
					"before: two" ,
					"after: two" ,
					"before: three" ,
					"after: three" ,
					"before: four" ,
					"after: four" ,
					"before: five" ,
					"after: five"
				] ) ;
				done() ;
			} ).catch( error => done( error ) ) ;
		} , 40 ) ;
	} ) ;
	
	
	
	it( "timeout -- .timeout()" , done => {
		var index = 0 ;
		var times = [ 0 , 10 , 40 , 10 ] ;
		var results = [] ;
		
		const asyncFn = ( value ) => {
			var p = seventh.Promise.resolveTimeout( times[ index ++ ] , value ) ;
			return p ;
		} ;
		
		const timedOutFn = seventh.timeout( 20 , asyncFn ) ;
		
		seventh.Promise.map( [
			timedOutFn().then( () => results[ 0 ] = true , () => results[ 0 ] = false ) ,
			timedOutFn().then( () => results[ 1 ] = true , () => results[ 1 ] = false ) ,
			timedOutFn().then( () => results[ 2 ] = true , () => results[ 2 ] = false ) ,
			timedOutFn().then( () => results[ 3 ] = true , () => results[ 3 ] = false ) ,
		] ).then( () => {
			expect( results ).to.eql( [ true , true , false , true ] ) ;
			done() ;
		} ).catch( error => done( error ) ) ;
	} ) ;
	
	
	
	it( "variable (per call) timeout -- .variableTimeout()" , done => {
		var index = 0 ;
		var times = [ 0 , 10 , 40 , 20 ] ;
		var results = [] ;
		
		const asyncFn = ( value ) => {
			var p = seventh.Promise.resolveTimeout( times[ index ++ ] , value ) ;
			return p ;
		} ;
		
		const timedOutFn = seventh.variableTimeout( asyncFn ) ;
		
		seventh.Promise.map( [
			timedOutFn( 10 ).then( () => results[ 0 ] = true , () => results[ 0 ] = false ) ,
			timedOutFn( 0 ).then( () => results[ 1 ] = true , () => results[ 1 ] = false ) ,
			timedOutFn( 20 ).then( () => results[ 2 ] = true , () => results[ 2 ] = false ) ,
			timedOutFn( 30 ).then( () => results[ 3 ] = true , () => results[ 3 ] = false ) ,
		] ).then( () => {
			expect( results ).to.eql( [ true , false , false , true ] ) ;
			done() ;
		} ).catch( error => done( error ) ) ;
	} ) ;
	
	
	
	it( "retry after failure -- .retry()" , done => {
		var count = 0 ;
		
		const asyncFn = ( value ) => {
			var  p ;
			
			count ++ ;
			
			if ( count < 4 ) { p = seventh.Promise.rejectTimeout( 20 , new Error( 'error!' ) ) ; }
			else { p = seventh.Promise.resolveTimeout( 20 , 'yay!' ) ; }
			
			return p ;
		} ;
		
		// The first one should succeed
		seventh.retry( 5 , 10 , 1.5 , asyncFn )().then( value => {
			expect( value ).to.be( 'yay!' ) ;
			expect( count ).to.be( 4 ) ;
			
			count = 0 ;
			
			// The second one should throw
			seventh.retry( 2 , 10 , 1.5 , asyncFn )().then( () => {
				done( new Error( 'It should throw!' ) ) ;
			} ).catch( () => done() ) ;
			
		} ).catch( error => done( error || new Error() ) ) ;
	} ) ;
	
	
	
	it( "variable retry after failure -- .variableRetry()" , done => {
		var count = 0 ;
		
		const asyncFn = ( value ) => {
			var  p ;
			
			count ++ ;
			
			if ( count < 4 ) { p = seventh.Promise.rejectTimeout( 20 , new Error( 'error!' ) ) ; }
			else { p = seventh.Promise.resolveTimeout( 20 , 'yay!' ) ; }
			
			return p ;
		} ;
		
		const retriedFn = seventh.variableRetry( asyncFn ) ;
		
		// The first one should succeed
		retriedFn( 5 , 10 , 1.5 ).then( value => {
			expect( value ).to.be( 'yay!' ) ;
			expect( count ).to.be( 4 ) ;
			
			count = 0 ;
			
			// The second one should throw
			retriedFn( 2 , 10 , 1.5 ).then( () => {
				done( new Error( 'It should throw!' ) ) ;
			} ).catch( () => done() ) ;
			
		} ).catch( error => done( error || new Error() ) ) ;
	} ) ;
	
	it( "promisify node style callback function -- .promisifyNodeFn()" ) ;
	it( "promisify node style callback function, limit to one argument after the error argument -- .promisifyNodeFnOne()" ) ;
} ) ;


