
// For the record...

var Promise = {} ;
const HOLE = {} ;

/*
	Not sure if this method will be kept.
	Values are transformed by iterator, any rejection are filtered out.
	
	With the 'maxCount' option, it resolves once as many promises have fulfilled.
	Without the 'minCount' option, it never rejects: errors are simply filtered out of the output array,
	with 'minCount' it rejects if there isn't as many promises that can fulfill, doing so as soon as detected.
	By default, the order of the elements are preserved, but if the 'fastestFirst' option is passed,
	the n fastest promises are injected first.
*/
Promise.filter = function filter( iterable , iterator = ( v => v ) , { minCount , maxCount , fastestFirst } = {} )
{
	var index = -1 , settled = false ,
		count = 0 , fulfillCount = 0 , rejectCount = 0 , length = Infinity ,
		value , values = [] ,
		filterPromise = new Promise() ;
	
	minCount = minCount || 0 ;
	maxCount = maxCount || Infinity ;
	
	for ( value of iterable )
	{
		index ++ ;
		
		// Create a scope to keep track of the promise's own index
		( () => {		// jshint ignore:line
			const promiseIndex = index ;
			
			Promise.resolve( value )
			.then( value => {
				if ( settled ) { return ; }
				return iterator( value , promiseIndex ) ;
			} )
			.then( value => {
				if ( settled ) { return ; }
				
				count ++ ;
				fulfillCount ++ ;
				
				if ( fastestFirst ) { values.push( value ) ; }
				else { values[ promiseIndex ] = value ; }
				
				if ( count >= length || fulfillCount >= maxCount )
				{
					settled = true ;
					if ( ! fastestFirst ) { values = values.filter( e => e !== HOLE ) ; }
					filterPromise.resolve( values ) ;
				}
			} )
			.catch( error => {
				if ( settled ) { return ; }
				
				count ++ ;
				rejectCount ++ ;
				
				if ( length - rejectCount < minCount )
				{
					settled = true ;
					filterPromise.reject( new Error( 'Promise.filter(): minCount requirement not met' ) ) ;
					return ;
				}
				
				if ( ! fastestFirst ) { values[ promiseIndex ] = HOLE ; }
				
				if ( count >= length )
				{
					settled = true ;
					if ( ! fastestFirst ) { values = values.filter( e => e !== HOLE ) ; }
					filterPromise.resolve( values ) ;
				}
			} ) ;
		} )() ;
	}
	
	length = index + 1 ;
	
	if ( length - rejectCount < minCount )
	{
		settled = true ;
		filterPromise.reject( new Error( 'Promise.filter(): minCount requirement not met' ) ) ;
	}
	else if ( ! length )
	{
		filterPromise.resolve( values ) ;
	}
	
	return filterPromise ;
} ;

