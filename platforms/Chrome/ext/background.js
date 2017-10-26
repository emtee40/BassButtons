//////////////////////////////////////////////////////////////////////////
// CLASS: Note - Used for various forms of notifications.
//////////////////////////////////////////////////////////////////////////
function Note( element )
{
	this.id = element.attributes.getNamedItem('id').value;
	this.text = element.attributes.getNamedItem('text').value;
	
	if( element.attributes.getNamedItem('link') != null )
	{
		this.link = element.attributes.getNamedItem('link').value;
	}
	else
	{
		this.link = null;
	}
}

//////////////////////////////////////////////////////////////////////////
// CLASS: Channel - Represents all information around a stream
//////////////////////////////////////////////////////////////////////////
function Channel( element )
{
	this.name = element.attributes.getNamedItem('name').value;
	this.imageRootName = element.attributes.getNamedItem('image').value;			
	
	if( element.attributes.getNamedItem('interval') != null )
	{
		this.interval = element.attributes.getNamedItem('interval').value;			
	}
	
	if( element.attributes.getNamedItem('stream') != null )
	{
		this.stream = element.attributes.getNamedItem('stream').value;			
	}
	
	if( element.attributes.getNamedItem('home') != null )
	{
		this.home = element.attributes.getNamedItem('home').value;
	}

	if( element.attributes.getNamedItem('action') != null )
	{
		this.action = element.attributes.getNamedItem('action').value;
	}

	if( element.attributes.getNamedItem('postfix') != null )
	{
		this.postfix = element.attributes.getNamedItem('postfix').value;
	}

	if( element.attributes.getNamedItem('type') != null )
	{
		this.type = element.attributes.getNamedItem('type').value;
	}
	else
	{
		this.type = 'unknown';
	}

	// Colour for the row
	if( element.attributes.getNamedItem('colour') != null )
	{
		this.colour = element.attributes.getNamedItem('colour').value.toString();
	}
	else
	{
		this.colour = 'red';
	}
	
	this.image = new Image( 200, 200 );
	this.valid = true; // Weather or not we found streams for this one.

	// Set up the image sources
	this.image.src = 'gfx/' + element.attributes.getNamedItem('image').value + '.png';
	
	notes = element.getElementsByTagName( 'notification' );
	
	// If this item has some notes, store those with the channel
	this.aNotifications = new Array();
	
	this.aURLs = new Array();
	this.iAddressPlaying = 0;

	if( notes.length )
	{
		for( var i=0; i<notes.length; i++ )
		{
			var note = new Note( notes[i] );
			this.aNotifications[i] = note;
		}
		
	}
}


function Stream()
{
	this.title = "";
	this.url = "";
}


//var stream = document.getElementById('audioplayer');
var stream = new Audio();

var gStreamPlaying = -1;
var gLastStreamPlayed = -1;

var gChannelSourceLocal = 'streams.xml';
var gChannelSourceRemote = gChannelSourceLocal; //'http://www.seriousbusiness.ca/bassbuttons/streams.xml';
//var gChannelSourceRemote = 'debug';

// Set up some globals
gGeneralNotes = new Array();
gChannels = new Array();
gStreams = new Array();



//////////////////////////////////////////////////////////////////////////
// parsePLS()
//////////////////////////////////////////////////////////////////////////
function parsePLS( response, channel )
{
	var lines = response.split( '\n' );

	if( lines[0] == "[playlist]" )
	{
		var entries = parseInt( lines[1].substring( 16 ) );
		
		for( var iLine=2, iStreamIndex=-1; iLine < lines.length; iLine++ )
		{
			// Parse the line
			var pair = lines[iLine].split( '=' );
			var strKey = pair[0];
			var strValue = pair[1];
			
			if( strKey.indexOf( 'File' ) != -1 )
			{
				iStreamIndex++;
				channel.aURLs[iStreamIndex] = new Stream(); 
				channel.aURLs[iStreamIndex].url = strValue;
				
				if( channel.postfix != null )
				{
					channel.aURLs[iStreamIndex].url = channel.aURLs[iStreamIndex].url + channel.postfix;
					channel.valid = true;
				}
			}
			else if( strKey.indexOf( 'Title' ) != -1 )
			{
				channel.aURLs[iStreamIndex].title = strValue;
			}
		}
	}
}


//////////////////////////////////////////////////////////////////////////
// parseM3U()
//////////////////////////////////////////////////////////////////////////
function parseM3U( response, channel )
{
	var iStreamIndex = 0;
	var lines = response.split( '\n' );

	//alert( response );

	for( var iLine=0; iLine < lines.length; iLine++ )
	{
		// Skip newlines and metadata, we don't need them (yet)
		if( lines[iLine][0] == '#' || lines[iLine][0] == '\n' )
		{
			continue;
		}
	
		var strValue = lines[iLine];

		channel.aURLs[iStreamIndex] = new Stream(); 
		channel.aURLs[iStreamIndex].url = strValue;
		channel.aURLs[iStreamIndex].title = strValue;
				
		if( channel.postfix != null )
		{
			channel.aURLs[iStreamIndex].url = channel.aURLs[iStreamIndex].url + channel.postfix;
			channel.valid = true;
		}
		
		iStreamIndex++;
	}
}


//////////////////////////////////////////////////////////////////////////
// Get stream list
//////////////////////////////////////////////////////////////////////////
function getStreamList( channel )
{
	// Load the XML
	var xmlhttp = new window.XMLHttpRequest();

	try
	{
		// Add a suffix to the request - to ensure it doesn't use the cached one.
		xmlhttp.open( "GET", channel.stream, false );
		xmlhttp.setRequestHeader( 'Pragma', 'Cache-Control: no-cache');
		xmlhttp.send(null);
	}
	catch( e )
	{
		channel.valid = false;
		//alert(e.message);
		return;
	}
	
	var response = xmlhttp.responseText;
	
	//alert( response );

	var ext = channel.stream.substr(channel.stream.lastIndexOf('.') + 1).toLowerCase();

	if( ext == 'pls' )
	{
		parsePLS( response, channel );
	}
	else if( ext == 'm3u' )
	{
		parseM3U( response, channel );
	}
	else
	{
		channel.valid = false;
		return;
	}
}

//////////////////////////////////////////////////////////////////////////
// loadChannels(): Downloads and parses the channels.xml file.
//////////////////////////////////////////////////////////////////////////
function loadChannels()
{
	// Reset the arrays
	gChannels = [];
	gGeneralNotes = [];

	// Load the XML
	var xmlhttp = new window.XMLHttpRequest();

	// try
	// {
		// // Add a suffix to the request - to ensure it doesn't use the cached one.
		// gChannelSourceRemote += '?_=' + (new Date()).getTime();		
	
		// xmlhttp.open("GET", gChannelSourceRemote, false);
		// xmlhttp.setRequestHeader( 'Pragma', 'Cache-Control: no-cache');
		// xmlhttp.send(null);
	// }
	// catch( e )
	// {
		// We failed to get a config file from the network, so load it locally.
//		xmlhttp.open("GET", gChannelSourceLocal, false);
//		xmlhttp.send(null);
//	}

	try
	{
		xmlhttp.open("GET", gChannelSourceLocal, false);
		xmlhttp.send(null);
	}
	catch( e )
	{
	}
	
	if( xmlhttp.status == 404 )
	{
		// We failed to get a config file from the network, so load it locally.
		xmlhttp.open("GET", gChannelSourceLocal, false);
		xmlhttp.send(null);
	}
	
	var parser = new DOMParser();
    xml = parser.parseFromString( xmlhttp.responseText, "text/xml" );

	var xmlDoc = xml.documentElement;

	// Get the general notifications
	var notes = xmlDoc.getElementsByTagName( "notifications" );

	// We only want the general ones here. 
	if( notes.length > 0 )
	{
		var generalnotes = notes[0].getElementsByTagName( "notification" ); 

		for( var i=0; i<generalnotes.length; i++ )
		{
			gGeneralNotes[i] = new Note( generalnotes[i] );
		}
	}

	// Get the channels
	var x = xmlDoc.getElementsByTagName( "channel" );
	var iChannels = x.length;

	// Fill out the local copy of our data
	for( var i=0; i<x.length; i++ )
	{
		gChannels[i] = new Channel( x[i] );
		
		// If this is a stream, parse the list
		if( gChannels[i].type == 'stream' )
		{
			getStreamList( gChannels[i] );  
		}
	}
}

						
function getPlayingStream()
{
	return gStreamPlaying;
}

function getLastStreamPlayed()
{
	return gLastStreamPlayed;
}

function setVolume( iVol )
{
	stream.volume = iVol;
}


function onStreamError()
{
	if( gChannels[gStreamPlaying].iAddressPlaying+1 == gChannels[gStreamPlaying].aURLs.length )
	{
		alert( 'Sorry. Failed to play this stream - the station may be down. Please try again later.\n' + gChannels[gStreamPlaying].aURLs[gChannels[gStreamPlaying].iAddressPlaying].url );
		gChannels[gStreamPlaying].iAddressPlaying = 0;  
		stopStream();
	}
	else
	{
	   gChannels[gStreamPlaying].iAddressPlaying++;
	   //alert( 'Trying ' + gChannels[gStreamPlaying].aURLs[gChannels[gStreamPlaying].iAddressPlaying].url );

		startStream( gStreamPlaying, gChannels[gStreamPlaying] ); 
	}
}


function startStream( index, channel )
{
	try
	{
		if( channel.type == 'stream' )
		{
			stopStream();

			gStreamPlaying = index; 
			gLastStreamPlayed = gStreamPlaying; 

			if( channel.type == 'stream' )
			{
				//alert( 'Starting: ' + channel.aURLs[channel.iAddressPlaying].url );
				stream.setAttribute('src', channel.aURLs[channel.iAddressPlaying].url );    
			}
			else
			{
				stream.setAttribute('src', channel.stream );    
			}

			stream.onerror = onStreamError;
			
			try
			{
				stream.load();
			}
			catch( e )
			{
				alert( e.message + '\nSorry. The stream failed to play -- the station may have gone down. Please try again later.\nWould love it if you would report this to darryl@seriousbusiness.ca\n' + gChannels[gStreamPlaying].aURLs[gChannels[gStreamPlaying].iAddressPlaying].url );
			}
		}
		else 
		{
			if( index != gLastStreamPlayed )
			{
				stopStream();

				gStreamPlaying = index;     
				gLastStreamPlayed = gStreamPlaying; 

				if( channel.type == 'stream' )
				{
					stream.setAttribute('src', channel.aURLs[channel.iAddressPlaying].url );    
				}
				else
				{
					stream.setAttribute('src', channel.stream );    
				}

				stream.load();
			}
		}

		stream.play();
	}
	catch( e )
	{
		alert( 'Error playing stream. Would love it if you would report this to darryl@seriousbusiness.ca\n' );
	}
}

function stopStream() 
{
	if( gStreamPlaying != -1 )
	{
		stream.pause();
	}
	
	gStreamPlaying = -1;
}

function onRefresh()
{
//		alert( 'Refreshing channels.' );
	loadChannels();
}

// Do it once to start
loadChannels();

// Now set it up to happen every 12 hours
gRefreshInterval = setInterval( onRefresh, 6*60*60*1000 );

// Release notes
if( localStorage['release_displayed'] != '2.0.5' )
{
	chrome.tabs.create( {'url': "release_notes.html" } ); // Need to figure out how to make this dynamic
	localStorage['release_displayed'] = '2.0.5';
}


