var Time;
var date = new Date();
var notification;
Ti.App.addEventListener('foo', function(data)
{
    Time = parseFloat(data.name);
    notification = Ti.App.iOS.scheduleLocalNotification(
    {
        alertBody : "Your bus will be here in " + Time + " minute(s)!",
        alertAction : "Okay",
        sound : "pop.caf",
        date : new Date(new Date().getTime()),
    });
});