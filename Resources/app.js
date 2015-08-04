// This is a single context, single window application
// There is only one master window to which sub views will be added
(function()
{
	if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad')
    {
        var service = Ti.App.iOS.registerBackgroundService(
        {
            url : 'bg.js'
        });
    }
    if (Ti.version < 1.8)
    {
        alert('Sorry - this application requires Titanium Mobile SDK 1.8 or later');
    }
    else
    {
        var ApplicationWindow = require('ui/ApplicationWindow').ApplicationWindow;
        new ApplicationWindow().open();
    }
})(); 