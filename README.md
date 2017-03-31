# TobiiWeb-Release
A C++ websocket server that provides webpages with gaze data coming from Tobii Eyex devices

TobiiWeb is made of two parts:
 * **Local Server**: a C++ server that streams the data coming from a Tobii EyeX device to a websocket connection
 * **Local Client**: a Javascript library which handles the websocket connection to the server

### Notes
If you're interested in extending TobiiWeb, you may refer to the [TobiiWeb](https://github.com/Mirco-Nani/TobiiWeb) repository, which contains the source version of the Local Server. 

### Browser compatibility
Tobii web is currently compatible with the following browsers:
 * Google Chrome
 * Mozilla Firefox

## Getting started

### Prerequisites
In order to successfully run TobiiWeb, you will need the following:
 * Windows OS
 * [Tobii EyeX Engine](http://developer.tobii.com/eyex-setup/)
 <br />
 
 Then, clone or download this repository.

### Running the c++ server
Make sure that your Tobii EyeX device is connected and enabled.<br />
Run the executable file "Local Server/TobiiWeb.exe".

### Running the Javascript client
Open the file "Local Client/index.html" in one of the compatible browsers listed above.<br />
You may open the browser's console to keep track of the connection state with the server.<br />
When the connection state in the console reports: <br />
`state: session_is_open`<br />
You should see a red dot following your gaze.<br />

## Using the Javascript client:
In order to use the **Local Client** in your webpage, import the javascript library "Local Client/js/TobiiWeb_Client.js"<br />
```javascript
<script type="text/javascript" src="js/TobiiWeb_Client.js"></script>
```
<br />

Then, initialize the TobiiWeb client:<br />

```javascript
TobiiWeb_Client.start({
  enable_state_machine_logs : true,
  services : [
      {name : "GazeTracking_Service", page_url : window.location.href}
  ],
  onMessage : {
      "GazeTracking_Service" : GazeCoordinatesReceiver({
          onGazeCoordinates: function(x,y){
              /*
                Here you will receive the coordinates of the user's gaze point as (x,y)
              */
          }
      })
  }
});
```
<br />

And that's it, you will receive the stream of gaze coordinates in the callback passed to the  `GazeCoordinatesReceiver`.

<br />

Then, whenever want to close the connection with the **Local Server** :<br />

```javascript
TobiiWeb_Client.stop();
```
<br />


### Things to know about Gaze Coordinates:
 * Gaze coordinates come in pairs of floating point numbers (x,y) and their unit of measure is *pixel* (yes, the precision is sub-pixel since they are floating point)
 * Gaze coordinates are always relative to the top-left corner of the most inner window containing the webpage, regardless the position of the browserweb in your screen.
 * A webpage will receive gaze coordinates only if they fall in its window, even if two webpages are visually overlapped on the screen.

<br />

### Additional services
The stream of gaze coordinates (namely, "GazeTracking_Service") is not the only service implemented in the **Local Server**. <br />
Currently, the following services are available:
 * GazeTracking_Service: provides the stream of gaze coodinates
 * Screenshot_Service: provides a Base64 encoded screenshot of the currently visible portion of the webpage.
 * Echo_Service: provides the same message sent from the **Local Client** back to it.
 
 <br />
 
 You can specify which services to use during the TobiiWeb client initialization.
 
 <br />
 
 ```javascript
TobiiWeb_Client.start({
  enable_state_machine_logs : true,
  services : [
      {name : "GazeTracking_Service", page_url : window.location.href},
      {name : "Screenshot_Service"}
  ],
  onMessage : {
      ""GazeTracking_Service"" : GazeCoordinatesReceiver({
          onGazeCoordinates: function(x,y){
              /*
                Here you will receive the coordinates of the user's gaze point as (x,y)
              */
          }
      }),
      "Screenshot_Service" : function(message){
          /*
            Here you will receive the Base64 current window's screenshot as message.img
          */
      }
  }
});
```

<br />

In the example above, two services are requested: *GazeTracking_Service* and *Screenshot_Service*. <br />
Unlike *GazeTracking_Service*, which provides a constant stream of data, *Screenshot_Service* needs to be triggered by a **request**. <br />
**Requests** are sent to the **Local Server** using **Messages**:

 ```javascript
TobiiWeb_Client.send_message("Screenshot_Service", {command:"take_screenshot"});
```

<br />

When the **Local Server** receives this message, it takes a screenshot of the current webpage in JPEG format, then it encodes it in Base64 and sends the result back to the **Local Client**.<br />
At this point, you can receive the Base64 encoded image in the callback:<br />

 ```javascript
 TobiiWeb_Client.start({
...
  onMessage : {
      ...
      "Screenshot_Service" : function(message){
          var base64Img = message.img;
      }
      ...
  }
});
```
