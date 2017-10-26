// Use this once live.
var giOpacityMax = 0.9;
var giOpacityMin = 0.5;
var giVolumeBlocks = 10;
var gbUseFadePages = false; // Determines whether or not to activate the experimental fading pages feature

var bgPage = chrome.extension.getBackgroundPage();
var fOpacity = 1.0;
var dir = 0;
var gInterval;

//////////////////////////////////////////////////////////////////////////
// sendNotification(): Pops up a user notification message
//////////////////////////////////////////////////////////////////////////
function sendNotification( channel, msg, link )
{
	if (Notification.permission !== "granted")
		Notification.requestPermission();
 	else {
			var notification = new Notification('Notification title', {
 				icon: 'icon128.png',
 				body: msg,
				title: channel
 		});
	}
}


//////////////////////////////////////////////////////////////////////////
// onTimer(): This is where I do the 'throb' effect
//////////////////////////////////////////////////////////////////////////
function onTimer()
{
	if( dir == 0 )
	{
		fOpacity = fOpacity - 0.05;

		if( fOpacity <= giOpacityMin )
		{
			dir = 1;
		}
	}
	else
	{
		fOpacity = fOpacity + 0.05;

		if( fOpacity >= giOpacityMax )
		{
			dir = 0;
		}
	}

	var strImageName = 'image' + bgPage.getPlayingStream();
	var image = document.getElementById( strImageName );
	image.style.opacity = fOpacity;
}


//////////////////////////////////////////////////////////////////////////
// play(): Play a channel
//////////////////////////////////////////////////////////////////////////
function play(index)
{
	if( bgPage.getPlayingStream() == index )
	{
		stop();
		return;
	}
	else if( bgPage.getPlayingStream() != -1 )
	{
		stop();
	}

	console.log( 'Selected channel: ' + index );

	bgPage.startStream( index, bgPage.gChannels[index] );
	gInterval = setInterval( onTimer, bgPage.gChannels[index].interval );

	// Display any notifications once
	if( bgPage.gChannels[index].aNotifications.length > 0 )
	{
		for( var i=0; i<bgPage.gChannels[index].aNotifications.length; i++ )
		{
			// Only notify the user once that there can be delays.
			var id = bgPage.gChannels[index].aNotifications[i].id;

			if( localStorage[id] != "sent" )
			{
				sendNotification( bgPage.gChannels[index].name, bgPage.gChannels[index].aNotifications[i].text, bgPage.gChannels[index].aNotifications[i].link );
				localStorage[id] = "sent";
			}
		}
	}
}


//////////////////////////////////////////////////////////////////////////
// onSelect(): Play a channel
//////////////////////////////////////////////////////////////////////////
function onSelect()
{
	var index = parseInt( $(this).attr("id") );

	// Reset everyone else's opacity
	//$(this).siblings().children().css( "opacity", "1.0" );
	$('*').css( "opacity", "1.0" );

	var indexPlaying =  bgPage.getPlayingStream();

	// See if this is a stop
	if( indexPlaying != -1 )
	{
		bgPage.stopStream();
	}

	// Color the selection
	//$(this).css( 'background-color', bgPage.gChannels[index].colour.toString() ).siblings().css( 'background-color', 'black' );
	//$(this).css( 'background', '-webkit-gradient(linear, 0% 0%, 0% 100%, from(#000000), to(#000000), color-stop(.5,' + gChannels[index].colour.toString() + '))' ).siblings().css( 'background', 'none' );

	console.log( 'Selected channel: ' + index );

	if( gInterval )
	{
		clearInterval( gInterval );
	}

	// If we're stopping the one we were playing, our work is done here.
	if( index == indexPlaying )
	{
		return;
	}
	else // Start something else.
	{
		bgPage.startStream( index, bgPage.gChannels[index] );
		gInterval = setInterval( onTimer, bgPage.gChannels[index].interval );
	}

}


function onVolumeClick( strId )
{
	var strLevel = this.id;

	if( strLevel == null )
	{
		strLevel = strId;
	}

	if( strLevel == "" )
	{
		strLevel = "10";
	}

	localStorage['volume'] = strLevel;

	var images = $('.btn_volume');
	var iClicked = parseInt( strLevel );

	for( var i=1; i<=giVolumeBlocks; i++ )
	{
		var strLED = 'gfx/LED_off.png';

		if( i <= iClicked )
		{
			strLED = 'gfx/LED_on.png';
		}

		images[i-1].src = strLED;
	}

	// Normalize the volume
	var vol = (iClicked-1)/(giVolumeBlocks-1)
	bgPage.setVolume( vol )
}


function buildButtonsPage()
{
	//////////////////////////////////////////////////////////////////////////
	// Dynamically build the channel list based on contents downloaded from
	// channels.xml
	//////////////////////////////////////////////////////////////////////////
	var html = '';

	// Finally, build the whole document.
	for( var i=0; i<bgPage.gChannels.length; i++ )
	{
		// Don't use it if we didn't parse it properly.
		if( bgPage.gChannels[i].aURLs.length == 0 )
		{
			continue;
		}

		html = html + '<li class=\"bassbutton\" id=\"'+ i +'\">';
		html = html + '<a class=\"bassbutton\" id=\"' + i + '\" title=\"' + bgPage.gChannels[i].name + '\" \>';
		html = html + '<img id=\"image' + i + '\" height=\"70px\" padding=\"0\" margin=\"0\" src=\"' + bgPage.gChannels[i].image.src + '\"></a>';
		html = html +  '</li>';
	}

	// Add the volume buttons
	html = html + '<li><center>';
	var iLeft = 8;
	// Build the volume control
	for( var i=1; i <= giVolumeBlocks; i++ )
	{
		html = html + '<a>';
		html = html + '<img class="btn_volume" id=\"' + i + '\" src=\"gfx/LED_off.png\" style=\"width:7px; padding=\"2px\" height:20px;\"/></a>';
	}
	html = html +  '</center></li>';

	$("#buttonlist").append( html );

	$(".btn_volume").click( onVolumeClick );

	// Set up the functions for clicking list items
	$("li.bassbutton").click( onSelect );

	if( localStorage['volume'] == undefined )
	{
		onVolumeClick( "10" );
	}
	else
	{
		onVolumeClick( localStorage['volume'] );
	}

	$("li").css( 'list-style', 'none' );
	$("li").css( 'padding-left', '0' );
	$("li").css( 'margin', '0' );
	$("ul").css( 'padding-left', '0' );
	$("ul").css( 'margin', '0' );

}


// function notifyTest() {
// 	if (Notification.permission !== "granted")
// 		Notification.requestPermission();
// 	else {
// 		var notification = new Notification('Notification title', {
// 			icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png',
// 			body: "This runs every time!",
// 		});
//
// 		notification.onclick = function () {
// 			window.open("http://stackoverflow.com/a/13328397/1269037");
// 		};
// 	}
// }


//////////////////////////////////////////////////////////////////////////
// START HERE
//////////////////////////////////////////////////////////////////////////
$(document).ready(function()
{
	// request permission on page load
	document.addEventListener('DOMContentLoaded', function () {
	  if (!Notification) {
	    alert('Desktop notifications not available in your browser. Try Chromium.');
	    return;
	  }

	  if (Notification.permission !== "granted")
	    Notification.requestPermission();
	});

	buildButtonsPage();

	// if we're playing a stream, make sure the throb comes back on
	if( bgPage.gStreamPlaying != -1 )
	{
		gInterval = setInterval( onTimer, bgPage.gChannels[bgPage.getPlayingStream()].interval );
	}
});
