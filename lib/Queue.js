/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

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



const Promise = require( './seventh.js' ) ;



function Queue( jobRunner , concurrency = 4 ) {
	this.remainingJobs = new Map() ;
	this.jobRunner = jobRunner ;
	this.jobsDone = new Set() ;
	this.concurrency = + concurrency || 1 ;

	this.runningJobs = 0 ;
	this.isLoopRunning = false ;
	this.isQueueRunning = true ;
	this.ready = Promise.resolved ;		// Internal

	// External API, resolved when there is no jobs anymore in the queue, a new Promise is created when new element are injected
	this.drained = Promise.resolved ;

	// External API, resolved when the Queue has nothing to do: either it's drained or the remaining jobs have dependencies that cannot be solved
	this.idle = Promise.resolved ;
}

Promise.Queue = Queue ;



function Job( id , dependencies , data ) {
	this.id = id ;
	this.dependencies = dependencies === null ? null : [ ... dependencies ] ;
	this.data = data ;
}

Queue.Job = Job ;



Queue.prototype.setConcurrency = function( concurrency ) { this.concurrency = + concurrency || 1 ; } ;
Queue.prototype.stop = function() { this.isQueueRunning = false ; } ;



Queue.prototype.add = Queue.prototype.addJob = function( id , data , dependencies = null ) {
	// Don't add it twice!
	if ( this.remainingJobs.has( id ) || this.jobsDone.has( id ) ) { return ; }
	this.remainingJobs.set( id , new Job( id , dependencies , data ) ) ;
	if ( this.isQueueRunning && ! this.isLoopRunning ) { this.run() ; }
	if ( this.drained.isSettled() ) { this.drained = new Promise() ; }
} ;



Queue.prototype.run = Queue.prototype.resume = async function() {
	var job , count ;

	this.isQueueRunning = true ;

	if ( this.isLoopRunning ) { return ; }
	this.isLoopRunning = true ;

	do {
		count = 0 ;

		for ( [ , job ] of this.remainingJobs ) {
			if ( job.dependencies && job.dependencies.some( dependencyId => ! this.jobsDone.has( dependencyId ) ) ) { continue ; }
			// This should be done synchronously:
			count ++ ;

			await this.ready ;

			// Something has stopped the queue while we were awaiting.
			// This check MUST be done only after "await", before is potentially synchronous, and things only change concurrently during an "await"
			if ( ! this.isQueueRunning ) { this.finishRun() ; return ; }

			this.runJob( job ) ;
		}
	} while ( count ) ;

	this.finishRun() ;
} ;



// Finish current run
Queue.prototype.finishRun = function() {
	this.isLoopRunning = false ;
	this.idle.resolve() ;
	if ( ! this.remainingJobs.size ) { this.drained.resolve() ; }
} ;



Queue.prototype.runJob = async function( job ) {
	this.runningJobs ++ ;
	if ( this.runningJobs >= this.concurrency ) { this.ready = new Promise() ; }
	if ( this.idle.isSettled() ) { this.idle = new Promise() ; }
	await this.jobRunner( job.data ) ;
	this.runningJobs -- ;
	this.jobsDone.add( job.id ) ;
	this.remainingJobs.delete( job.id ) ;
	if ( this.runningJobs < this.concurrency ) { this.ready.resolve() ; }
} ;

