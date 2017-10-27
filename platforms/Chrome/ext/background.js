
//////////////////////////////////////////////////////////////////////////
// CLASS: Channel - Represents all information around a stream
//////////////////////////////////////////////////////////////////////////
function Channel( channel )
{
	this.name = channel.name;
	this.imageRootName = channel.image;
	this.interval = channel.interval;
  this.stream = channel.stream;
	this.home = channel.home;
	this.action = channel.action;
	this.postfix = channel.postfix;
	this.type = channel.type;
	this.colour = channel.colour;

	this.image = new Image( 200, 200 );
	this.valid = true; // Weather or not we found streams for this one.

	// Set up the image sources
	this.image.src = 'gfx/' + channel.image + '.png';

	this.aURLs = new Array();
	this.iAddressPlaying = 0;
	this.ext = channel.ext;
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
gChannels = new Array();
gStreams = new Array();



//////////////////////////////////////////////////////////////////////////
// parsePLS()
//////////////////////////////////////////////////////////////////////////
function parsePLS( response, channel )
{
	var lines = response.split( '\n' );

	// Get rid of extraneous linebreaks etc.
	var type = lines[0].replace(/(\r\n|\n|\r)/gm,"");

	if( type == "[playlist]" )
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
	var xmlhttp = new XMLHttpRequest();

	try
	{
		// Add a suffix to the request - to ensure it doesn't use the cached one.
		xmlhttp.open( "GET", channel.stream, true );
		xmlhttp.onload = function( e ) {
			var response = xmlhttp.responseText;

			//alert( response );
			var ext = channel.ext;

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
		};

		xmlhttp.setRequestHeader( 'Pragma', 'Cache-Control: no-cache');
		xmlhttp.send(null);
	}
	catch( e )
	{
		channel.valid = false;
		//alert(e.message);
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

	// Load the XML
	firebase.database().ref('/channels').once('value').then( function( snapshot ) {

		var channels = snapshot.val();
		var iChannels = channels.length;

		// Fill out the local copy of our data
		for( var i=0; i<iChannels; i++ )
		{
			gChannels[i] = new Channel( channels[i] );

			// If this is a stream, parse the list
			if( gChannels[i].type == 'playlist' ) {
				getStreamList( gChannels[i] );
			}
			else if( gChannels[i].type == 'stream' ) {
				gChannels[i].aURLs[0] = new Stream();
				gChannels[i].aURLs[0].url = gChannels[i].stream;
				gChannels[i].aURLs[0].title = gChannels[i].name;
				gChannels[i].valid = true;
			}
		}
	});
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
		if( channel.type == 'stream' || channel.type == 'playlist' )
		{
			stopStream();

			gStreamPlaying = index;
			gLastStreamPlayed = gStreamPlaying;

			//alert( 'Starting: ' + channel.aURLs[channel.iAddressPlaying].url );
			stream.setAttribute('src', channel.aURLs[channel.iAddressPlaying].url );
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

				stream.setAttribute('src', channel.aURLs[channel.iAddressPlaying].url );
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


var config = {
	 apiKey: "AIzaSyDlJZsCm18dsDCtqghEpo9VIjvC-j_re1E",
	 authDomain: "bassbuttons.firebaseapp.com",
	 databaseURL: "https://bassbuttons.firebaseio.com",
	 projectId: "bassbuttons",
	 storageBucket: "bassbuttons.appspot.com",
	 messagingSenderId: "963912646493"
 };

 firebase.initializeApp(config);

// Do it once to start
loadChannels();

// Release notes
if( localStorage['release_displayed'] != '2.0.5' )
{
	chrome.tabs.create( {'url': "release_notes.html" } ); // Need to figure out how to make this dynamic
	localStorage['release_displayed'] = '2.0.5';
}
