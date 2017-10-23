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



describe( "Basic standard-compliant Promise" , () => {
	
	describe( "Then and catch behavior" , () => {
		
		it( ".then() chain" , done => {
			
			var thenCount = 0 ;
			
			seventh.Promise.resolveTimeout( 10 , 'one' )
			.then( value => {
				expect( value ).to.be( 'one' ) ;
				thenCount ++ ;
				return 'two' ;
			} )
			.then( value => {
				expect( value ).to.be( 'two' ) ;
				thenCount ++ ;
				return seventh.Promise.resolveTimeout( 10 , 'three' ) ;
			} )
			.then( value => {
				expect( value ).to.be( 'three' ) ;
				thenCount ++ ;
			} )
			.then( () => {
				expect( thenCount ).to.be( 3 ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( ".catch() chain" , done => {
			
			var thenCount = 0 , catchCount = 0 ;
			
			seventh.Promise.rejectTimeout( 10 , new Error( 'doh!' ) )
				.catch( error => {
					expect( error.message ).to.be( 'doh!' ) ;
					catchCount ++ ;
					throw new Error( 'dang!' ) ;
				} )
				.catch( error => {
					expect( error.message ).to.be( 'dang!' ) ;
					catchCount ++ ;
					return seventh.Promise.rejectTimeout( 10 , new Error( 'ooops!' ) ) ;
				} )
				.catch( error => {
					expect( error.message ).to.be( 'ooops!' ) ;
					catchCount ++ ;
				} )
				.then( () => {
						expect( thenCount ).to.be( 0 ) ;
						expect( catchCount ).to.be( 3 ) ;
						done() ;
					} )
				.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( ".catch() propagation" , done => {
			
			var thenCount = 0 , catchCount = 0 ;
			
			seventh.Promise.rejectTimeout( 10 , new Error( 'doh!' ) )
				.then( () => seventh.Promise.resolveTimeout( 10 , thenCount ++ ) )
				.then( () => seventh.Promise.resolveTimeout( 10 , thenCount ++ ) )
				.catch( error => {
					expect( error.message ).to.be( 'doh!' ) ;
					catchCount ++ ;
				} )
				.then( () => {
						expect( thenCount ).to.be( 0 ) ;
						expect( catchCount ).to.be( 1 ) ;
						done() ;
					} )
				.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "executor throwing synchronously should trigger .catch()" , done => {
			
			new seventh.Promise( ( resolve , reject ) => {
				throw new Error( 'throw!' ) ;
			} )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				// Catch part:
				error => {
					expect( error.message ).to.be( 'throw!' ) ;
					done()
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "then-handler throwing synchronously should trigger .catch()" , done => {
			
			seventh.Promise.resolveTimeout( 0 )
			.then( () => { throw new Error( 'throw inside then!' ) ; } )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				// Catch part:
				error => {
					expect( error.message ).to.be( 'throw inside then!' ) ;
					done()
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Edge case: synchronous settlement" , () => {
		
		it( "synchronous resolve() should still trigger .then() asynchronously" , done => {
			
			var order = [] ;
			
			var p = new seventh.Promise( ( resolve , reject ) => {
				order.push( 'executor' ) ;
				resolve() ;
			} ) ;
			
			p.then( () => order.push( 'then' ) ) ;
			
			order.push( 'sync after' ) ;
			
			p.then( () => {
				expect( order ).to.eql( [ 'executor' , 'sync after' , 'then' ] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "synchronous reject() should still trigger .catch() asynchronously" , done => {
			
			var order = [] ;
			
			var p = new seventh.Promise( ( resolve , reject ) => {
				order.push( 'executor' ) ;
				reject() ;
			} ) ;
			
			p.catch( () => order.push( 'catch' ) ) ;
			
			order.push( 'sync after' ) ;
			
			p.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				() => {
					expect( order ).to.eql( [ 'executor' , 'sync after' , 'catch' ] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "synchronous throwing should still trigger .catch() asynchronously" , done => {
			
			var order = [] ;
			
			var p = new seventh.Promise( ( resolve , reject ) => {
				order.push( 'executor' ) ;
				throw new Error( 'Error!' ) ;
			} ) ;
			
			p.catch( () => order.push( 'catch' ) ) ;
			
			order.push( 'sync after' ) ;
			
			p.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				() => {
					expect( order ).to.eql( [ 'executor' , 'sync after' , 'catch' ] ) ;
					done()
				}
			).catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
} ) ;



describe( "Promise to callback" , done => {
	
	it( "Promise#callback() / Promise#callbackify() / Promise#nodeify()" , done => {
		const okFn = callback => {
			seventh.Promise.resolveTimeout( 10 , 'value!' ).callback( callback ) ;
		} ;
		
		const koFn = callback => {
			seventh.Promise.rejectTimeout( 10 , new Error( 'failed!' ) ).callback( callback ) ;
		} ;
		
		okFn( ( error , value ) => {
			try {
				expect( error ).to.be( undefined ) ;
				expect( value ).to.be( 'value!' ) ;
			}
			catch ( error ) {
				done( error ) ;
				return ;
			}
			
			koFn( ( error , value ) => {
				try {
					expect( error ).to.be.ok() ;
					expect( error.message ).to.be( 'failed!' ) ;
					expect( value ).to.be( undefined ) ;
				}
				catch ( error ) {
					done( error ) ;
					return ;
				}
				
				done() ;
			} ) ;
		} ) ;
	} ) ;
	
	it( "Promise#callbackAll() / Promise#callbackifyAll() / Promise#nodeifyAll()" , done => {
		const okFn = callback => {
			seventh.Promise.resolveTimeout( 10 , [ 'one' , 'two' , 'three' ] ).callbackAll( callback ) ;
		} ;
		
		const koFn = callback => {
			seventh.Promise.rejectTimeout( 10 , new Error( 'failed!' ) ).callbackAll( callback ) ;
		} ;
		
		okFn( ( error , arg1 , arg2 , arg3 ) => {
			try {
				expect( error ).to.be( undefined ) ;
				expect( arg1 ).to.be( 'one' ) ;
				expect( arg2 ).to.be( 'two' ) ;
				expect( arg3 ).to.be( 'three' ) ;
			}
			catch ( error ) {
				done( error ) ;
				return ;
			}
			
			koFn( ( error , value ) => {
				try {
					expect( error ).to.be.ok() ;
					expect( error.message ).to.be( 'failed!' ) ;
					expect( value ).to.be( undefined ) ;
				}
				catch ( error ) {
					done( error ) ;
					return ;
				}
				
				done() ;
			} ) ;
		} ) ;
	} ) ;
} ) ;


	
describe( "Promise flow control" , () => {
	
	describe( "Promise.all()" , () => {
		
		it( "with resolvable-promises only, it should resolve with an array of values" , done => {
			
			seventh.Promise.all( [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] )
			.then( values => {
				expect( values ).to.eql( [ 'one' , 'two' , 'three' ] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "starting with a rejected promise, it should reject" , done => {
			
			seventh.Promise.all( [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.rejectTimeout( 0 , new Error( 'rejected!' ) ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'rejected!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "ending with a rejected promise, it should reject" , done => {
			
			seventh.Promise.all( [
				seventh.Promise.rejectTimeout( 20 , new Error( 'rejected!' ) ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'rejected!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "with a rejected promise in the middle, it should reject" , done => {
			
			seventh.Promise.all( [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.rejectTimeout( 10 , new Error( 'rejected!' ) )
			] )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'rejected!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Promise.map() / Promise.every()" , () => {
		
		it( "using a synchronous iterator with resolvable-promises only, it should resolve to an array of values" , done => {
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.map( promiseArray , str => str + str )
			.then( values => {
				expect( values ).to.eql( [ 'oneone' , 'twotwo' , 'threethree' ] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous iterator with resolvable-promises only, it should resolve to an array of values" , done => {
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.map( promiseArray , str => seventh.Promise.resolveTimeout( 10 , str + str ) )
			.then( values => {
				expect( values ).to.eql( [ 'oneone' , 'twotwo' , 'threethree' ] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using a synchronous throwing iterator, it should reject" , done => {
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.map( promiseArray , str => { throw new Error( 'failed!' ) ; } )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous rejecting iterator, it should reject" , done => {
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.map( promiseArray , str => seventh.Promise.rejectTimeout( 10 ,  new Error( 'failed!' ) ) )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous iterator rejecting at the end, it should reject" , done => {
			
			var index = 0 ;
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.map( promiseArray , str => {
				if ( ++ index === 3 ) { return seventh.Promise.rejectTimeout( 10 ,  new Error( 'failed!' ) ) ; }
				else { return seventh.Promise.resolveTimeout( 10 , str + str ) ; }
			} )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "no iterator call should be wasted if the Promise.map() has already failed" , done => {
			
			var count = 0 , order = [] , p ;
			
			var promiseArray = [
				( p = seventh.Promise.resolveTimeout( 20 , 'one' ) ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.rejectTimeout( 10 , new Error( 'failed!' ) )
			] ;
			
			const iterator = str => {
				count ++ ;
				order.push( str ) ;
				return seventh.Promise.resolveTimeout( 10 , str + str ) ;
			} ;
			
			seventh.Promise.map( promiseArray , iterator )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					
					// Wait 20ms after the slowest promise, to ensure the iterator can be called
					p.then( () => seventh.Promise.resolveTimeout( 20 ) )
					.then( () => {
						expect( order ).to.eql( [ 'two' ] ) ;
						expect( count ).to.be( 1 ) ;
						done() ;
					} )
					.catch( error => done( error || new Error() ) ) ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Promise.any()" , () => {
		
		it( "with resolvable-promises only, it should resolve to the fastest promise's value" , done => {
			
			seventh.Promise.any( [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] )
			.then( values => {
				expect( values ).to.be( 'two' ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "starting with a rejected promise, it should resolve to the second one" , done => {
			
			seventh.Promise.any( [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.rejectTimeout( 0 , new Error( 'rejected!' ) ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] )
			.then( values => {
				expect( values ).to.be( 'three' ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "with resolvable-promises only, it should reject with an array of rejection" , done => {
			
			seventh.Promise.any( [
				seventh.Promise.rejectTimeout( 20 , new Error( 'rejection1' ) ) ,
				seventh.Promise.rejectTimeout( 0 , new Error( 'rejection2' ) ) ,
				seventh.Promise.rejectTimeout( 10 , new Error( 'rejection3' ) )
			] )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				errors => {
					expect( errors.map( e => e.message ) ).to.eql( [ 'rejection1' , 'rejection2' , 'rejection3' ] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Promise.some()" , () => {
		
		it( "using a synchronous iterator with resolvable-promises only, it should resolve to the fastest promise's value" , done => {
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.some( promiseArray , str => str + str )
			.then( values => {
				expect( values ).to.be( 'twotwo' ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous iterator with resolvable-promises only, it should resolve to the fastest promise's value" , done => {
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.some( promiseArray , str => seventh.Promise.resolveTimeout( 10 , str + str ) )
			.then( values => {
				expect( values ).to.eql( 'twotwo' ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using a synchronous throwing iterator, it should reject" , done => {
			
			var index = 0 ;
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.some( promiseArray , str => { throw new Error( 'failed!' + ( ++ index ) ) ; } )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				errors => {
					expect( errors.map( e => e.message ) ).to.eql( [ 'failed!3' , 'failed!1' , 'failed!2' ] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous rejecting iterator, it should reject" , done => {
			
			var index = 0 ;
			
			var promiseArray = [
				seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.resolveTimeout( 10 , 'three' )
			] ;
			
			seventh.Promise.some( promiseArray , str => seventh.Promise.rejectTimeout( 10 ,  new Error( 'failed!' + ( ++ index ) ) ) )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				errors => {
					expect( errors.map( e => e.message ) ).to.eql( [ 'failed!3' , 'failed!1' , 'failed!2' ] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "no iterator call should be wasted if the Promise.some() has already resolved" , done => {
			
			var count = 0 , order = [] , p ;
			
			var promiseArray = [
				( p = seventh.Promise.resolveTimeout( 20 , 'one' ) ) ,
				seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				seventh.Promise.rejectTimeout( 10 , 'three' )
			] ;
			
			const iterator = str => {
				count ++ ;
				order.push( str ) ;
				return seventh.Promise.resolveTimeout( 10 , str + str ) ;
			} ;
			
			seventh.Promise.some( promiseArray , iterator )
			.then( value => {
				expect( value ).to.be( 'twotwo' ) ;
				
				// Wait 20ms after the slowest promise, to ensure the iterator can be called
				p.then( () => seventh.Promise.resolveTimeout( 20 ) )
				.then( () => {
					expect( order ).to.eql( [ 'two' ] ) ;
					expect( count ).to.be( 1 ) ;
					done() ;
				} )
				.catch( error => done( error || new Error() ) ) ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Promise.filter()" , () => {
		
		it( "Promise.filter() should filter an array of values using an iterator return value (direct value or promise)" , done => {
			
			var array = [
				1 , 5 , 7 , 3 , 10 ,
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
				seventh.Promise.resolveTimeout( 10 , -1 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 )
			] ;
			
			const filter = v => {
				if ( v < 6 ) { return seventh.Promise.resolveTimeout( 10 , true ) ; }
				else { return seventh.Promise.resolveTimeout( 10 , false ) ; }
			} ;
			
			seventh.Promise.filter( array , filter )
			.then( results => {
				expect( results ).to.eql( [ 1, 5 , 3 , 2 , -1 ] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "Promise.filter() any error should reject the whole promise" , done => {
			
			var array = [
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , -1 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
				seventh.Promise.rejectTimeout( 10 , new Error( 'promise failed!' ) ) ,
				seventh.Promise.resolveTimeout( 10 , 4 ) ,
			] ;
			
			var array2 = [
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , -1 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
				seventh.Promise.resolveTimeout( 10 , 4 ) ,
			] ;
			
			const filter = v => {
				if ( v < 6 ) { return seventh.Promise.resolveTimeout( 10 , true ) ; }
				else { return seventh.Promise.resolveTimeout( 10 , false ) ; }
			} ;
			
			const failFilter = v => {
				if ( v < 6 ) { return seventh.Promise.resolveTimeout( 10 , true ) ; }
				else { return seventh.Promise.rejectTimeout( 10 , new Error( 'filter failed!' ) ) ; }
			} ;
			
			const syncFailFilter = v => {
				if ( v < 6 ) { return seventh.Promise.resolveTimeout( 10 , true ) ; }
				else { throw new Error( 'filter sync failed!' ) ; }
				//else { return seventh.Promise.rejectTimeout( 10 , new Error( 'filter sync failed!' ) ) ; }
			} ;
			
			seventh.Promise.filter( array , filter )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'promise failed!' ) ;
					
					seventh.Promise.filter( array2 , failFilter )
					.then(
						() => { throw new Error( 'Should throw!' ) ; } ,
						error => {
							expect( error.message ).to.be( 'filter failed!' ) ;
							
							seventh.Promise.filter( array2 , syncFailFilter )
							.then(
								() => { throw new Error( 'Should throw!' ) ; } ,
								error => {
									expect( error.message ).to.be( 'filter sync failed!' ) ;
									done() ;
								}
							)
							.catch( error => done( error || new Error() ) ) ;
						}
					)
					.catch( error => done( error || new Error() ) ) ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Promise.forEach()" , () => {
		
		it( "Promise.forEach() should run the iterator in series" , done => {
			
			var results = [] ;
			
			const iterator = ( value , index ) => {
				results.push( 'before ' + index + ': ' + value ) ;
				
				var p = new seventh.Promise( resolve => {
					setTimeout( () => {
						results.push( 'after ' + index + ': ' + value ) ;
						resolve() ;
					} , 20 ) ;
				} ) ;
				
				return p ;
			} ;
			
			var array = [
				1 , 5 , 7 ,
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
			] ;
			
			seventh.Promise.forEach( array , iterator )
			.then( () => {
				expect( results ).to.eql( [
					"before 0: 1" ,
					"after 0: 1" ,
					"before 1: 5" ,
					"after 1: 5" ,
					"before 2: 7" ,
					"after 2: 7" ,
					"before 3: 2" ,
					"after 3: 2" ,
					"before 4: 8" ,
					"after 4: 8"
				] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "Promise.forEach() should stop and reject with the first element rejection" , done => {
			
			var results = [] ;
			
			const iterator = ( value , index ) => {
				results.push( 'before ' + index + ': ' + value ) ;
				
				var p = new seventh.Promise( resolve => {
					setTimeout( () => {
						results.push( 'after ' + index + ': ' + value ) ;
						resolve() ;
					} , 20 ) ;
				} ) ;
				
				return p ;
			} ;
			
			var array = [
				seventh.Promise.resolveTimeout( 10 , 1 ) ,
				seventh.Promise.resolveTimeout( 10 , 5 ) ,
				seventh.Promise.rejectTimeout( 10 , new Error( 'failed!' ) ) ,
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
			] ;
			
			seventh.Promise.forEach( array , iterator )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					expect( results ).to.eql( [
						"before 0: 1" ,
						"after 0: 1" ,
						"before 1: 5" ,
						"after 1: 5"
					] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "Promise.forEach() should stop and reject with the first iterator rejection" , done => {
			
			var results = [] ;
			
			const iterator = ( value , index ) => {
				results.push( 'before ' + index + ': ' + value ) ;
				
				var p = new seventh.Promise( ( resolve , reject ) => {
					setTimeout( () => {
						results.push( 'after ' + index + ': ' + value ) ;
						if ( index === 2 ) { reject( new Error( 'failed!' ) ) ; }
						else { resolve() ; }
					} , 20 ) ;
				} ) ;
				
				return p ;
			} ;
			
			var array = [
				seventh.Promise.resolveTimeout( 10 , 1 ) ,
				seventh.Promise.resolveTimeout( 10 , 5 ) ,
				seventh.Promise.resolveTimeout( 10 , 7 ) ,
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
			] ;
			
			seventh.Promise.forEach( array , iterator )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					expect( results ).to.eql( [
						"before 0: 1" ,
						"after 0: 1" ,
						"before 1: 5" ,
						"after 1: 5" ,
						"before 2: 7" ,
						"after 2: 7"
					] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Promise.reduce()" , () => {
		
		it( "Promise.reduce() should run the iterator in series" , done => {
			
			var results = [] ;
			
			const iterator = ( accumulator , value , index ) => {
				results.push( 'before ' + index + ': ' + value + ' -- ' + accumulator ) ;
				
				var p = new seventh.Promise( resolve => {
					setTimeout( () => {
						accumulator += value ;
						results.push( 'after ' + index + ': ' + value + ' -- ' + accumulator ) ;
						resolve( accumulator ) ;
					} , 20 ) ;
				} ) ;
				
				return p ;
			} ;
			
			var array = [
				1 , 5 , 7 ,
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
			] ;
			
			seventh.Promise.reduce( array , iterator , 3 )
			.then( () => {
				expect( results ).to.eql( [
					"before 0: 1 -- 3" ,
					"after 0: 1 -- 4" ,
					"before 1: 5 -- 4" ,
					"after 1: 5 -- 9" ,
					"before 2: 7 -- 9" ,
					"after 2: 7 -- 16" ,
					"before 3: 2 -- 16" ,
					"after 3: 2 -- 18" ,
					"before 4: 8 -- 18" ,
					"after 4: 8 -- 26"
				] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "Promise.reduce() should stop and reject with the first element rejection" , done => {
			
			var results = [] ;
			
			const iterator = ( accumulator , value , index ) => {
				results.push( 'before ' + index + ': ' + value + ' -- ' + accumulator ) ;
				
				var p = new seventh.Promise( resolve => {
					setTimeout( () => {
						accumulator += value ;
						results.push( 'after ' + index + ': ' + value + ' -- ' + accumulator ) ;
						resolve( accumulator ) ;
					} , 20 ) ;
				} ) ;
				
				return p ;
			} ;
			
			var array = [
				seventh.Promise.resolveTimeout( 10 , 1 ) ,
				seventh.Promise.resolveTimeout( 10 , 5 ) ,
				seventh.Promise.rejectTimeout( 10 , new Error( 'failed!' ) ) ,
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
			] ;
			
			seventh.Promise.reduce( array , iterator , 3 )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					expect( results ).to.eql( [
					"before 0: 1 -- 3" ,
					"after 0: 1 -- 4" ,
					"before 1: 5 -- 4" ,
					"after 1: 5 -- 9"
					] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "Promise.reduce() should stop and reject with the first iterator rejection" , done => {
			
			var results = [] ;
			
			const iterator = ( accumulator , value , index ) => {
				results.push( 'before ' + index + ': ' + value + ' -- ' + accumulator ) ;
				
				var p = new seventh.Promise( ( resolve , reject ) => {
					setTimeout( () => {
						accumulator += value ;
						results.push( 'after ' + index + ': ' + value + ' -- ' + accumulator ) ;
						if ( index === 2 ) { reject( new Error( 'failed!' ) ) ; }
						else { resolve( accumulator ) ; }
					} , 20 ) ;
				} ) ;
				
				return p ;
			} ;
			
			var array = [
				seventh.Promise.resolveTimeout( 10 , 1 ) ,
				seventh.Promise.resolveTimeout( 10 , 5 ) ,
				seventh.Promise.resolveTimeout( 10 , 7 ) ,
				seventh.Promise.resolveTimeout( 10 , 2 ) ,
				seventh.Promise.resolveTimeout( 10 , 8 ) ,
			] ;
			
			seventh.Promise.reduce( array , iterator , 3 )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					expect( results ).to.eql( [
					"before 0: 1 -- 3" ,
					"after 0: 1 -- 4" ,
					"before 1: 5 -- 4" ,
					"after 1: 5 -- 9" ,
					"before 2: 7 -- 9" ,
					"after 2: 7 -- 16"
					] ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
	
	describe( "Promise.mapObject()" , () => {
		
		it( "using a synchronous iterator with resolvable-promises only, it should resolve to an object of values" , done => {
			
			var promiseObject = {
				a: seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				b: seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				c: seventh.Promise.resolveTimeout( 10 , 'three' )
			} ;
			
			seventh.Promise.mapObject( promiseObject , str => str + str )
			.then( values => {
				expect( values ).to.eql( { a: 'oneone' , b: 'twotwo' , c: 'threethree' } ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous iterator with resolvable-promises only, it should resolve to an object of values" , done => {
			
			var promiseObject = {
				a: seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				b: seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				c: seventh.Promise.resolveTimeout( 10 , 'three' )
			} ;
			
			seventh.Promise.mapObject( promiseObject , str => seventh.Promise.resolveTimeout( 10 , str + str ) )
			.then( values => {
				expect( values ).to.eql( { a: 'oneone' , b: 'twotwo' , c: 'threethree' } ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using a synchronous throwing iterator, it should reject" , done => {
			
			var promiseObject = {
				a: seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				b: seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				c: seventh.Promise.resolveTimeout( 10 , 'three' )
			} ;
			
			seventh.Promise.mapObject( promiseObject , str => { throw new Error( 'failed!' ) ; } )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous rejecting iterator, it should reject" , done => {
			
			var promiseObject = {
				a: seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				b: seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				c: seventh.Promise.resolveTimeout( 10 , 'three' )
			} ;
			
			seventh.Promise.mapObject( promiseObject , str => seventh.Promise.rejectTimeout( 10 ,  new Error( 'failed!' ) ) )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "using an asynchronous iterator rejecting at the end, it should reject" , done => {
			
			var index = 0 ;
			var promiseObject = {
				a: seventh.Promise.resolveTimeout( 20 , 'one' ) ,
				b: seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				c: seventh.Promise.resolveTimeout( 10 , 'three' )
			} ;
			
			seventh.Promise.mapObject( promiseObject , str => {
				if ( ++ index === 3 ) { return seventh.Promise.rejectTimeout( 10 ,  new Error( 'failed!' ) ) ; }
				else { return seventh.Promise.resolveTimeout( 10 , str + str ) ; }
			} )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
		
		it( "no iterator call should be wasted if the Promise.mapObject() has already failed" , done => {
			
			var count = 0 , order = [] , p ;
			
			var promiseObject = {
				a: ( p = seventh.Promise.resolveTimeout( 30 , 'one' ) ) ,
				b: seventh.Promise.resolveTimeout( 0 , 'two' ) ,
				c: seventh.Promise.rejectTimeout( 20 , new Error( 'failed!' ) ) ,
				d: seventh.Promise.resolveTimeout( 10 , 'four' )
			} ;
			
			const iterator = ( str , k ) => {
				count ++ ;
				order.push( k + ': ' + str ) ;
				return seventh.Promise.resolveTimeout( 10 , str + str ) ;
			} ;
			
			seventh.Promise.mapObject( promiseObject , iterator )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					
					// Wait 20ms after the slowest promise, to ensure the iterator can be called
					p.then( () => seventh.Promise.resolveTimeout( 20 ) )
					.then( () => {
						expect( order ).to.eql( [ 'b: two' , 'd: four' ] ) ;
						expect( count ).to.be( 2 ) ;
						done() ;
					} )
					.catch( error => done( error || new Error() ) ) ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} ) ;
	} ) ;
} ) ;



describe( "Wrappers and decorators" , () => {
	
	it( "promisify node style callback function, limit to one argument after the error argument -- .promisify()" , done => {
		
		const okFn = ( callback ) => {
			setTimeout( () => callback( undefined , 'arg' , 'trash' ) , 10 ) ;
		} ;
		
		const koFn = ( callback ) => {
			setTimeout( () => callback( new Error( 'failed!' ) ) , 10 ) ;
		} ;
		
		const promisifiedOkFn = seventh.promisify( okFn ) ;
		const promisifiedKoFn = seventh.promisify( koFn ) ;
		
		promisifiedOkFn().then( value => {
			expect( value ).to.be( 'arg' ) ;
			
			promisifiedKoFn().then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
	
	it( "promisify node style callback function -- .promisifyAll()" , done => {
		
		const okFn = ( callback ) => {
			setTimeout( () => callback( undefined , 'arg1' , 'arg2' , 'arg3' ) , 10 ) ;
		} ;
		
		const koFn = ( callback ) => {
			setTimeout( () => callback( new Error( 'failed!' ) ) , 10 ) ;
		} ;
		
		const promisifiedOkFn = seventh.promisifyAll( okFn ) ;
		const promisifiedKoFn = seventh.promisifyAll( koFn ) ;
		
		promisifiedOkFn().then( value => {
			expect( value ).to.eql( [ 'arg1' , 'arg2' , 'arg3' ] ) ;
			
			promisifiedKoFn().then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'failed!' ) ;
					done() ;
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
	
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
	
	it( "serialize, successive executions never overlap -- .serialize()" , done => {
		
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
} ) ;



describe( "Thenable support" , () => {
	
	it( "Promise.isThenable()" , () => {
		
		expect( seventh.Promise.isThenable( new seventh.Promise() ) ).to.be.ok() ;
		expect( seventh.Promise.isThenable( new Promise( resolve => resolve() ) ) ).to.be.ok() ;
		expect( seventh.Promise.isThenable( { then: resolve => resolve() } ) ).to.be.ok() ;
		expect( seventh.Promise.isThenable( { then: 'bob' } ) ).not.to.be.ok() ;
		expect( seventh.Promise.isThenable( {} ) ).not.to.be.ok() ;
	} ) ;
	
	it( "Promise.fromThenable() from native promises" , done => {
		
		expect( seventh.Promise.fromThenable( new Promise( resolve => resolve() ) ) ).to.be.a( seventh.Promise ) ;
		
		seventh.Promise.fromThenable( new Promise( resolve => setTimeout( () => resolve( 'yay' ) , 10 ) ) )
		.then( value => {
			expect( value ).to.be( 'yay' ) ;
			seventh.Promise.fromThenable(
				new Promise( ( resolve , reject ) => setTimeout( () => reject( new Error( 'doh!' ) ) , 10 ) )
			)
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'doh!' ) ;
					done()
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
	
	
	// Dummy thenable class
	function Thenable( isSuccess , value )
	{
		this.onResolve = null ;
		this.onReject = null ;
		
		setTimeout( () => {
			if ( isSuccess && typeof this.onResolve === 'function' ) { this.onResolve( value ) ; }
			else if ( ! isSuccess && typeof this.onReject === 'function' ) { this.onReject( value ) ; }
		} , 20 ) ;
	}
	
	// Only support one handler, but it's good enough for this test
	Thenable.prototype.then = function then( onResolve , onReject )
	{
		this.onResolve = onResolve ;
		this.onReject = onReject ;
	} ;
	
	
	it( "Promise.fromThenable() from unknown thenable object" , done => {
		
		expect( seventh.Promise.fromThenable( new Thenable( true ) ) ).to.be.a( seventh.Promise ) ;
		
		seventh.Promise.fromThenable( new Thenable( true , 'yay' ) )
		.then( value => {
			expect( value ).to.be( 'yay' ) ;
			seventh.Promise.fromThenable( new Thenable( false , new Error( 'doh!' ) ) )
			.then(
				() => { throw new Error( 'Should throw!' ) ; } ,
				error => {
					expect( error.message ).to.be( 'doh!' ) ;
					done()
				}
			)
			.catch( error => done( error || new Error() ) ) ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
	
	it( "Thenable support as .then() return value" , done => {
		
		seventh.Promise.resolveTimeout( 10 , 'one' )
		.then( value => {
			expect( value ).to.be( 'one' ) ;
			return new Thenable( true , value + '-two' ) ;
		} )
		.then( value => {
			expect( value ).to.be( 'one-two' ) ;
			done() ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
} ) ;



describe( "Dormant promise" , () => {
	
	it( "Promise.dormant() should execute only once the first fulfill handler is attached" , done => {
		
		var order = [] ;
		
		var promise = seventh.Promise.dormant( ( resolve , reject ) => {
			order.push( 'exec' ) ;
			resolve( 'value' ) ;
		} ) ;
		
		order.push( 'sync after 1' ) ;
		
		seventh.Promise.resolveTimeout( 10 )
		.then( () => {
			expect( order ).to.eql( [ 'sync after 1' ] ) ;
			
			promise.then( result => {
				order.push( 'then' ) ;
				expect( result ).to.be( 'value' ) ;
				expect( order ).to.eql( [ 'sync after 1' , 'exec' , 'sync after 2' , 'then' ] ) ;
				done() ;
			} )
			.catch( error => done( error || new Error() ) ) ;
			
			order.push( 'sync after 2' ) ;
			expect( order ).to.eql( [ 'sync after 1' , 'exec' , 'sync after 2' ] ) ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
	
	it( "rejection handlers should not wake up the promise" , done => {
		
		var order = [] ;
		
		var promise = seventh.Promise.dormant( ( resolve , reject ) => {
			order.push( 'exec' ) ;
			resolve( 'value' ) ;
		} ) ;
		
		order.push( 'sync after 1' ) ;
		
		seventh.Promise.resolveTimeout( 10 )
		.then( () => {
			expect( order ).to.eql( [ 'sync after 1' ] ) ;
			var p2 = promise.catch( () => null ) ;
			order.push( 'sync after 2' ) ;
			expect( order ).to.eql( [ 'sync after 1' , 'sync after 2' ] ) ;
			p2.then( () => null ) ;
			order.push( 'sync after 3' ) ;
			expect( order ).to.eql( [ 'sync after 1' , 'sync after 2' , 'exec' , 'sync after 3' ] ) ;
			done() ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
} ) ;



describe( "Misc" , () => {
	it( "asyncExit() TODO" ) ;
} ) ;



describe( "Async-try-catch module compatibility" , () => {
	it( "async-try-catch module compatibility tests" ) ;
} ) ;



describe( "Historical bugs" , () => {
	
	it( ".then() sync chain" , done => {
		
		var thenCount = 0 ;
		
		seventh.Promise.resolve( 'one' )
		.then( value => {
			expect( value ).to.be( 'one' ) ;
			thenCount ++ ;
			return 'two' ;
		} )
		.then( value => {
			expect( value ).to.be( 'two' ) ;
			thenCount ++ ;
			return 'three' ;
		} )
		.then( value => {
			expect( value ).to.be( 'three' ) ;
			thenCount ++ ;
		} )
		.then( () => {
			expect( thenCount ).to.be( 3 ) ;
			done() ;
		} )
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
	
	it( ".then() sync chain throwing" , done => {
		
		var thenCount = 0 ;
		
		seventh.Promise.resolve( 'one' )
		.then( value => {
			expect( value ).to.be( 'one' ) ;
			thenCount ++ ;
			return 'two' ;
		} )
		.then( value => {
			expect( value ).to.be( 'two' ) ;
			thenCount ++ ;
			throw new Error( 'throw!' ) ;
		} )
		.then( value => {
			thenCount ++ ;
		} )
		.then(
			() => { throw new Error( 'Should throw!' ) ; } ,
			error => {
				expect( thenCount ).to.be( 2 ) ;
				expect( error.message ).to.be( 'throw!' ) ;
				done() ;
			}
		)
		.catch( error => done( error || new Error() ) ) ;
	} ) ;
} ) ;

