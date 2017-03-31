/*! @license
 *
 *  Copyright 2016 Mirco Nani
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/*************************************************** Mir_window_tools *************************************************************************/
if (!Mir_windowTools) { var Mir_windowTools = new Object(); };

Mir_windowTools = {
    scrollBarPadding: 17, // padding to assume for scroll bars

    //CUSTOM
    get_browserweb_coordinates: function()
    {
        //NOT SUPPORTED by IE8 or less
        coordX=(typeof window.screenLeft == "number") ? window.screenLeft : window.screenX;
        coordY=(typeof window.screenTop == "number") ? window.screenTop : window.screenY;
        return{
            x : coordX,
            y : coordY
        };
    },

    //CUSTOM
    get_browserweb_size : function()
    {
        //NOT SUPPORTED by IE8 or less
        var width= window.outerWidth;
        var height = window.outerHeight;
        var result={};
        result.width=width;
        result.height=height;

        return result;
    },

    get_document_size: function()
    {
        // document dimensions
        var viewportWidth, viewportHeight;
        if (window.innerHeight && window.scrollMaxY) {
            viewportWidth = document.body.scrollWidth;
            viewportHeight = window.innerHeight + window.scrollMaxY;
        } else if (document.body.scrollHeight > document.body.offsetHeight) {
            // all but explorer mac
            viewportWidth = document.body.scrollWidth;
            viewportHeight = document.body.scrollHeight;
        } else {
            // explorer mac...would also work in explorer 6 strict, mozilla and safari
            viewportWidth = document.body.offsetWidth;
            viewportHeight = document.body.offsetHeight;
        };
        return {
            width: viewportWidth,
            height: viewportHeight
        };
    },

    get_viewPort_size: function()
    {
        // view port dimensions
        var windowWidth, windowHeight;
        if (self.innerHeight) {
            // all except explorer
            windowWidth = self.innerWidth;
            windowHeight = self.innerHeight;
        } else if (document.documentElement && document.documentElement.clientHeight) {
            // explorer 6 strict mode
            windowWidth = document.documentElement.clientWidth;
            windowHeight = document.documentElement.clientHeight;
        } else if (document.body) {
            // other explorers
            windowWidth = document.body.clientWidth;
            windowHeight = document.body.clientHeight;
        };
        return {
            width: windowWidth,
            height: windowHeight
        };
    },

    get_scroll_offset: function() 
    {
        // viewport vertical scroll offset
        var horizontalOffset, verticalOffset;
        if (self.pageYOffset) {
            horizontalOffset = self.pageXOffset;
            verticalOffset = self.pageYOffset;
        } else if (document.documentElement && document.documentElement.scrollTop) {
            // Explorer 6 Strict
            horizontalOffset = document.documentElement.scrollLeft;
            verticalOffset = document.documentElement.scrollTop;
        } else if (document.body) {
            // all other Explorers
            horizontalOffset = document.body.scrollLeft;
            verticalOffset = document.body.scrollTop;
        };
        return {
            horizontal: horizontalOffset,
            vertical: verticalOffset
        };
    },

};
/*************************************************** END Mir_window_tools *************************************************************************/


var GazeStreamFilters = {
        none : "none",
        mean : "mean"
}

var GazeCoordinatesReceiver = function(params){
    if(params.filter == undefined){
        params.filter = GazeStreamFilters.mean;
    }
    if(params.filter_size == undefined){
        params.filter_size = 5;
    }
    if(params.onGazeCoordinates == undefined){
        params.onGazeCoordinates = function(x,y){}
    }
    var coordinates_handler = {
    
        filters : {
            fixedSized_queue : {
                queue : [],
                enqueue : function(content)
                {
                    this.queue.push(content);

                    if(this.queue.length > params.filter_size)
                    {
                        return this.queue.shift();
                    }    
                    return false;
                },
                dequeue : function()
                {
                    if(this.queue.lenght > 0)
                        return this.queue.shift();
                    return false;
                }

            },
            
            mean_filter : function()
            {
                var filtered_x=0;
                for(index in this.fixedSized_queue.queue)
                {
                    filtered_x += this.fixedSized_queue.queue[index].x;
                }
                filtered_x = filtered_x / this.fixedSized_queue.queue.length;

                var filtered_y=0;
                for(index in this.fixedSized_queue.queue)
                {
                    filtered_y += this.fixedSized_queue.queue[index].y;
                }
                filtered_y = filtered_y / this.fixedSized_queue.queue.length;

                return {x : filtered_x, y : filtered_y}
            }
        },
        apply_filter : function(param_x,param_y)
        {
            if(params.filter == GazeStreamFilters.none)
            {
                return {x : param_x, y : param_y}
            }
            
            var coords = {x : param_x, y : param_y};
            this.filters.fixedSized_queue.enqueue(coords);
            if(TobiiWeb_Client.params.use_filter == TobiiWeb_Filters.mean)
            {
                return this.filters.mean_filter();
            }
        },
        process_coordinates : function(coords)
        {
            //console.log(coords.x + " - " + coords.y);
            var tracked_values ={
                browser_x : Mir_windowTools.get_browserweb_coordinates().x,
                browser_y : Mir_windowTools.get_browserweb_coordinates().y,
                browser_width : Mir_windowTools.get_browserweb_size().width,
                browser_height : Mir_windowTools.get_browserweb_size().height,
                viewport_width : Mir_windowTools.get_viewPort_size().width,
                viewport_height : Mir_windowTools.get_viewPort_size().height,
                detected_viewport_x : coords.viewport_x,
                detected_viewport_y : coords.viewport_y,
                calculated_viewport_x : Mir_windowTools.get_browserweb_coordinates().x,
                calculated_viewport_y : Mir_windowTools.get_browserweb_coordinates().y + (Mir_windowTools.get_browserweb_size().height - Mir_windowTools.get_viewPort_size().height),
                
                timestamp : coords.timestamp
            }
            tracked_values.client_side_applied_filter = params.use_filter;
            
            filtered_coords = coordinates_handler.apply_filter(coords.x,coords.y);
            tracked_values.filtered_x=filtered_coords.x;
            tracked_values.filtered_y=filtered_coords.y;
            
            tracked_values.document_relative_filtered_x = tracked_values.filtered_x + Mir_windowTools.get_scroll_offset().horizontal;
            tracked_values.document_relative_filtered_y = tracked_values.filtered_y + Mir_windowTools.get_scroll_offset().vertical;
            
            /*
            tracked_values.user_created_data = TobiiWeb_Client.onGazeCoordinates( 
                tracked_values.filtered_x,
                tracked_values.filtered_y

            );
            */
            params.onGazeCoordinates(tracked_values.filtered_x,tracked_values.filtered_y)
            
        }    
    }
    return coordinates_handler.process_coordinates;
}

var TobiiWeb_Client = {
    params : {
        enable_state_machine_logs : false,
        connection_delay : 1000,
        authentication_delay : 1000,
        websocket_address : "ws://127.0.0.1:6675/ws",
        use_filter : "none",
        filter_size : 5,
        respond_to_server : false,
        services : [
            {name : "GazeTracking_Service"}
        ],
        onMessage : {

        }
        
    },
    service_requested : function(service)
    {
        for(i in this.params.services)
        {
            if( this.params.services[i].name == service)
            {
                return true;
            }
        }
        return false;
    },
    update_params : function(opts)
    {
        for(index in opts)
        {
            if(this.params[index] != undefined)
            {
                this.params[index]=opts[index];
            }
        }
    },
    onGazeCoordinates : function(){},
    
}

var TobiiWeb_Filters = {
    none : "none",
    mean : "mean"
}

var TobiiWeb_coordinates_handler = {
    
    filters : {
        fixedSized_queue : {
            queue : [],
            enqueue : function(content)
            {
                this.queue.push(content);

                if(this.queue.length > TobiiWeb_Client.params.filter_size)
                {
                    return this.queue.shift();
                }    
                return false;
            },
            dequeue : function()
            {
                if(this.queue.lenght > 0)
                    return this.queue.shift();
                return false;
            }

        },
        
        mean_filter : function()
        {
            var filtered_x=0;
            for(index in this.fixedSized_queue.queue)
            {
                filtered_x += this.fixedSized_queue.queue[index].x;
            }
            filtered_x = filtered_x / this.fixedSized_queue.queue.length;

            var filtered_y=0;
            for(index in this.fixedSized_queue.queue)
            {
                filtered_y += this.fixedSized_queue.queue[index].y;
            }
            filtered_y = filtered_y / this.fixedSized_queue.queue.length;

            return {x : filtered_x, y : filtered_y}
        }
    },
    apply_filter : function(param_x,param_y)
    {
        if(TobiiWeb_Client.params.use_filter == TobiiWeb_Filters.none)
        {
            return {x : param_x, y : param_y}
        }
        
        var coords = {x : param_x, y : param_y};
        this.filters.fixedSized_queue.enqueue(coords);
        if(TobiiWeb_Client.params.use_filter == TobiiWeb_Filters.mean)
        {
            return this.filters.mean_filter();
        }
    },
    process_coordinates : function(coords)
    {
        //console.log(coords.x + " - " + coords.y);
        var tracked_values ={
            browser_x : Mir_windowTools.get_browserweb_coordinates().x,
            browser_y : Mir_windowTools.get_browserweb_coordinates().y,
            browser_width : Mir_windowTools.get_browserweb_size().width,
            browser_height : Mir_windowTools.get_browserweb_size().height,
            viewport_width : Mir_windowTools.get_viewPort_size().width,
            viewport_height : Mir_windowTools.get_viewPort_size().height,
            detected_viewport_x : coords.viewport_x,
            detected_viewport_y : coords.viewport_y,
            calculated_viewport_x : this.browser_x,
            calculated_viewport_y : this.browser_y + (this.browser_height - this.viewport_height),
            
            timestamp : coords.timestamp
        }
        tracked_values.client_side_applied_filter = TobiiWeb_Client.params.use_filter;
        
        filtered_coords = this.apply_filter(coords.x,coords.y);
        tracked_values.filtered_x=filtered_coords.x;
        tracked_values.filtered_y=filtered_coords.y;
        
        tracked_values.document_relative_filtered_x = tracked_values.filtered_x + Mir_windowTools.get_scroll_offset().horizontal;
        tracked_values.document_relative_filtered_y = tracked_values.filtered_y + Mir_windowTools.get_scroll_offset().vertical;
        
        tracked_values.user_created_data = TobiiWeb_Client.onGazeCoordinates( 
            tracked_values.filtered_x,
            tracked_values.filtered_y

        );
        
        if(TobiiWeb_Client.params.respond_to_server)
        {
            this.sendClientResponse_toClientDataService(tracked_values);
        }
    }
    
}

var TobiiWeb_webSocket = {
    
    flags : {
        //system_initialized : false,
        window_is_active : document.hasFocus(),
        session_is_open : false
    },
    
    webSocket : false,
    open_webSocket : function()
    {
        if(this.webSocket)
        {
            this.close_webSocket();
        }
        this.webSocket = new WebSocket(TobiiWeb_Client.params.websocket_address);
        this.webSocket.onopen = this.webSocket_callbacks.onopen;
        this.webSocket.onmessage = this.webSocket_callbacks.onmessage;
        this.webSocket.onclose = this.webSocket_callbacks.onclose;
    },
    close_webSocket : function()
    {
        if(this.webSocket)
        {
            this.webSocket.close();
            this.webSocket = false;
        }
    },
    send_authentication_request : function()
    {
        if(this.webSocket)
        {
            var toSend = {
                type : "web_page_authentication",
                browser_x : Mir_windowTools.get_browserweb_coordinates().x,
                browser_y : Mir_windowTools.get_browserweb_coordinates().y,
                browser_width : Mir_windowTools.get_browserweb_size().width,
                browser_height : Mir_windowTools.get_browserweb_size().height,
                viewport_width : Mir_windowTools.get_viewPort_size().width,
                viewport_height : Mir_windowTools.get_viewPort_size().height,
            };
        this.webSocket.send(JSON.stringify(toSend));
        }
    },
    send_authentication_failed : function()
    {
        if(this.webSocket)
        {
            var toSend = {
                type : "web_page_authentication_failed"
            }
            this.webSocket.send(JSON.stringify(toSend));
        }
    },
    send_authentication_successful : function()
    {
        if(this.webSocket)
        {
            var toSend = {
                type : "web_page_authentication_successful",
                services : TobiiWeb_Client.params.services
            }
            this.webSocket.send(JSON.stringify(toSend));
        }
    },
    send_session_failed : function()
    {
        if(this.webSocket)
        {
            var toSend = {
                type : "web_page_session_failed"
            }
            this.webSocket.send(JSON.stringify(toSend));
        }
    },
    send_client_response : function(response)
    {
        if(this.webSocket)
        {
            var toSend = response;
            toSend.type = "application_content";
            this.webSocket.send( JSON.stringify(toSend) );
        }
    },
    send_client_response_to_service: function(response, service_name)
    {
        if(!TobiiWeb_Client.service_requested(service_name))
        {
            return;
        }
        if(this.webSocket)
        {
            var toSend = response;
            toSend.type = "application_content";
            toSend.service = service_name;
            this.webSocket.send( JSON.stringify(toSend) );
        }
    }
    
}

var TobiiWeb_StateMachine = {
    get_current_state_name : function(){
        if(this.current_state)
        {    
            return this.current_state.name;
        }
        else
        {
            return null;
        }
    },
    
    log : function(toLog)
    {
        if(TobiiWeb_Client.params.enable_state_machine_logs)
        {
            console.log(toLog);
        }
    },
    
    current_state : {},
    
    change_state : function(next_state)
    {
        this.reset_pending_event();
        this.current_state=next_state;
        this.log("state: "+this.current_state.name);
        this.current_state.behaviour();
    },
    
    pending_event : false,
    send_event_after : function(event, milliseconds)
    {
        this.reset_pending_event();
        
        var stateMachine = this;
        this.pending_event = setTimeout(function()
        {
            stateMachine.sendEvent(event);
        }, 
        milliseconds);
    },
    reset_pending_event : function()
    {
        if(this.pending_event)
        {
            clearTimeout(this.pending_event);
        }
        this.pending_event = false;
    },
    
    init : function(){
        this.change_state(new this.states.disconnected(this));
    },
    
    sendEvent : function(event)
    {
        this.reset_pending_event();
        this.current_state.onEvent(event);
    },
    
    sendEvent : function(event)
    {
        if(!event.type)
        {
            if(typeof event == "string")
            {
                event = {type : event};
            }
            else
            {
                console.log(event);
                throw "malformed event: missing type";
                return;
            }
            
        }
        
        this.reset_pending_event();
        this.current_state.onEvent(event);
        
    },
    
    states : {
        disconnected : function(state_machine) 
        {
            this.name = "disconnected";
            this.behaviour = function()
            {
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "connect" :
                            state_machine.change_state(new state_machine.states.trying_to_connect(state_machine));
                            break;
                    }
                }
            }
        },
        trying_to_connect : function(state_machine)
        {
            this.name = "trying_to_connect";
            this.behaviour = function() //pending events are cleared by the state machine before executing behaviour
            {
                state_machine.send_event_after("enstablish_connection",TobiiWeb_Client.params.connection_delay);
            };
            this.onEvent = function(event) //pending events are cleared by the state machine when an event arrives
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "enstablish_connection" :
                            state_machine.change_state(new state_machine.states.connecting(state_machine));
                            break;
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        /*
                        case "window_inactive" :
                            state_machine.change_state(new state_machine.states.waiting_window_active(state_machine));
                            break;
                        */
                        default : 
                            //if an unwanted event clears the pending "enstablish_connection", the behaviour must be re-executed
                            state_machine.change_state(new state_machine.states.trying_to_connect(state_machine));
                            break;
                    }
                }
            }
        },
        connecting : function(state_machine) 
        {
            this.name = "connecting";
            this.behaviour = function()
            {
                TobiiWeb_webSocket.open_webSocket();
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                            /*
                        case "restore_session" :
                            state_machine.change_state(new state_machine.states.trying_to_restore_session(state_machine));
                            break;
                            */
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "connected" :
                            state_machine.change_state(new state_machine.states.connected(state_machine));
                            break;
                        
                    }
                }
            }
        },
        connected : function(state_machine) 
        {
            this.name = "connected";
            this.behaviour = function()
            {
                state_machine.sendEvent("authenticate");
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "authenticate" :
                            state_machine.change_state(new state_machine.states.authenticating(state_machine));
                            break;
                    }
                }
            }
        },
        trying_to_authenticate : function(state_machine) 
        {
            this.name = "trying_to_authenticate";
            this.behaviour = function()
            {
                state_machine.send_event_after("authenticate",TobiiWeb_Client.params.authentication_delay);
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "authenticate" :
                            state_machine.change_state(new state_machine.states.authenticating(state_machine));
                            break;
                        default : 
                            //if an unwanted event clears the pending "authenticate", the behaviour must be re-executed
                            state_machine.change_state(new state_machine.states.trying_to_authenticate(state_machine));
                            break;
                    }
                }
            }
        },
        authenticating : function(state_machine) 
        {
            this.name = "authenticating";
            this.behaviour = function()
            {
                if(!TobiiWeb_webSocket.flags.window_is_active)
                {
                    state_machine.sendEvent("window_inactive");
                }
                else
                {
                    TobiiWeb_webSocket.send_authentication_request();
                }
                
            };
            this.onEvent = function(event)
            {
                this.name = "disconnected";
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "authenticated" :
                            state_machine.change_state(new state_machine.states.authenticated(state_machine));
                            break;
                        case "window_inactive" :
                            state_machine.change_state(new state_machine.states.authentication_failed(state_machine));
                            break;
                        case "authentication_failed_received" :
                            state_machine.change_state(new state_machine.states.trying_to_authenticate(state_machine));
                            break;
                    }
                }
            }
        },
        authentication_failed : function(state_machine) //the window is not active:
        //here, an authentication failure message is sent to TobiiWeb_server,
        {
            this.name = "authentication_failed";
            this.behaviour = function()
            {
                TobiiWeb_webSocket.send_authentication_failed();
                state_machine.sendEvent("authentication_failed_sent");
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "authentication_failed_sent" :
                            state_machine.change_state(new state_machine.states.waiting_window_active(state_machine));
                            break;
                        case "window_active" :
                            state_machine.change_state(new state_machine.states.authenticating(state_machine));
                            break;
                    }
                }
            }
        },
        waiting_window_active : function(state_machine) //the window is not active:
        //here, the StateMachine waits for a disconnection, or the window to become active again,
        {
            this.name = "waiting_window_active";
            this.behaviour = function()
            {
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "window_active" :
                            state_machine.change_state(new state_machine.states.trying_to_authenticate(state_machine));
                            break;
                    }
                }
            }
        },
        authenticated : function(state_machine) 
        {
            this.name = "authenticated";
            this.behaviour = function()
            {
                TobiiWeb_webSocket.send_authentication_successful();
                state_machine.sendEvent("authentication_successful_sent")
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "authentication_successful_sent" :
                            state_machine.change_state(new state_machine.states.session_is_open(state_machine));
                            break;
                    }
                }
            }
        },
        session_is_open : function(state_machine) 
        {
            this.name = "session_is_open";
            this.behaviour = function()
            {
                TobiiWeb_webSocket.flags.session_is_open = true;
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "window_hidden" :
                            state_machine.change_state(new state_machine.states.session_failed(state_machine));
                            break;
                    }
                }
            }
        },
        session_failed : function(state_machine)// thewindow is not visible.
        //here the state machine sends a session failure to the GGTS_server
        //and waits for a dosconnection, or the window to become visible again.
        {
            this.name = "session_failed";
            this.behaviour = function()
            {
                TobiiWeb_webSocket.send_session_failed();
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "closing" :
                        case "disconnect" :
                            state_machine.change_state(new state_machine.states.disconnecting(state_machine));
                            break;
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                        case "window_visible" :
                            state_machine.change_state(new state_machine.states.trying_to_authenticate(state_machine));
                            break;
                        
                    }
                }
            }
        },
        disconnecting : function(state_machine)
        {
            this.name = "disconnecting";
            this.behaviour = function()
            {
                TobiiWeb_webSocket.close_webSocket();
            };
            this.onEvent = function(event)
            {
                if(event)
                {
                    switch(event.type)
                    {
                        case "disconnected" :
                            state_machine.change_state(new state_machine.states.disconnected(state_machine));
                            break;
                    }
                }
            }
        }
    }
}
TobiiWeb_StateMachine.init();

TobiiWeb_coordinates_handler.sendClientResponse = function(json_response)
{
    if(TobiiWeb_StateMachine.get_current_state_name()=="session_is_open")
    {
        TobiiWeb_webSocket.send_client_response(json_response);
    }
}
TobiiWeb_coordinates_handler.sendClientResponse_toLogService = function(json_response)
{
    if(TobiiWeb_StateMachine.get_current_state_name()=="session_is_open")
    {
    }
}
TobiiWeb_coordinates_handler.sendClientResponse_toClientDataService = function(json_response)
{
    if(TobiiWeb_StateMachine.get_current_state_name()=="session_is_open")
    {
        TobiiWeb_webSocket.send_client_response_to_service(json_response,"ClientData_Service");
    }
}

TobiiWeb_webSocket.webSocket_callbacks = {
    onopen : function()
    {
        TobiiWeb_StateMachine.sendEvent({type : "connected"});
    },
    onmessage : function(e)
    {
        var msg = e.data;
        msg = msg.replace(/[\n]/g, '\\n');
        msg = msg.replace(/[\r]/g, '\\r');
        var content;
        content = JSON.parse(msg);
        if(content.type=="web_page_authentication_done")
        {
            TobiiWeb_StateMachine.sendEvent({type : "authenticated"});
        }
        else if(content.type=="web_page_authentication_failed")
        {
            TobiiWeb_StateMachine.sendEvent({type : "authentication_failed_received"});
        }  
        else if(content.type=="gaze_coordinates")
        {
            if( TobiiWeb_Client.params.onMessage["GazeTracking_Service"] == undefined){
                TobiiWeb_coordinates_handler.process_coordinates(content);
                console.log(content)
            }else{
                TobiiWeb_Client.params.onMessage["GazeTracking_Service"](content)
            }
            
        }
        else if(content.type=="service_message")
        {
            TobiiWeb_Client.params.onMessage[content.service](content.content)
        }
    },
    onclose : function()
    {
        TobiiWeb_StateMachine.sendEvent({type : "disconnected"});
    }
}

window.onbeforeunload = function(event)
//THIS IS SOOOO IMPORTANT! without it, server throws an exception on refresh page if a socket connection is open!
{
    TobiiWeb_StateMachine.sendEvent({type : "closing"});
};
window.onfocus = function () 
{ 
    TobiiWeb_webSocket.flags.window_is_active = true;
    TobiiWeb_StateMachine.sendEvent({type : "window_active"});
}; 
window.onblur = function () 
{ 
    TobiiWeb_webSocket.flags.window_is_active = false;
    TobiiWeb_StateMachine.sendEvent({type : "window_inactive"});
}; 
TobiiWeb_window_visibility = {};
TobiiWeb_window_visibility.on_window_hidden = function()
{
    TobiiWeb_StateMachine.sendEvent({type : "window_hidden"});
}
TobiiWeb_window_visibility.on_window_visible= function()
{
    TobiiWeb_StateMachine.sendEvent({type : "window_visible"});
}
TobiiWeb_window_visibility.set_window_visibility_checks=function() {
    
    var hidden = "hidden";

    // Standards:
    if (hidden in document)
        document.addEventListener("visibilitychange", onchange);
    else if ((hidden = "mozHidden") in document)
        document.addEventListener("mozvisibilitychange", onchange);
    else if ((hidden = "webkitHidden") in document)
        document.addEventListener("webkitvisibilitychange", onchange);
    else if ((hidden = "msHidden") in document)
        document.addEventListener("msvisibilitychange", onchange);
    // IE 9 and lower:
    else if ("onfocusin" in document)
        document.onfocusin = document.onfocusout = onchange;
    // All others:
    else
        window.onpageshow = window.onpagehide
        /* = window.onfocus = window.onblur*/ = onchange;

    function onchange (evt) {
        var v = "visible", h = "hidden",
        evtMap = {
          focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
        };

        evt = evt || window.event;

        var result="none";

        if (evt.type in evtMap)
            result = evtMap[evt.type];
        else
            result = this[hidden] ? "hidden" : "visible";

        //CUSTOM
        if(result == "hidden") TobiiWeb_window_visibility.on_window_hidden();
        if(result == "visible") TobiiWeb_window_visibility.on_window_visible();
    
    }

    // set the initial state (but only if browser supports the Page Visibility API)
    if( document[hidden] !== undefined )
    onchange({type: document[hidden] ? "blur" : "focus"});


}
TobiiWeb_window_visibility.set_window_visibility_checks();

TobiiWeb_Client.start = function(opts)
{
    this.update_params(opts);

    TobiiWeb_StateMachine.sendEvent({type : "connect"});
}
TobiiWeb_Client.stop = function()
{
    TobiiWeb_StateMachine.sendEvent({type : "disconnect"});
}

TobiiWeb_Client.send_message = function(service, message){
    if(TobiiWeb_StateMachine.get_current_state_name()=="session_is_open")
    {
        TobiiWeb_webSocket.send_client_response_to_service(message, service);
    }
}