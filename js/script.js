(function(){
    var pomodoro = 1000 * 60 * 25;
   
    /*
    tasks : [
        { name : 'Task one' , remaining : 0, date : 1386641200000, active : false },
        { name : 'Task two' , remaining : pomodoro, date : 1386643229000, active : false }, 
        { name : 'Task three' , remaining : pomodoro, date : 1386641219000, active : false },
        { name : 'Task four' , remaining : 0, date : 1386641221000, active: false },
    ],
    */

    // Save and load methods for localStorage
    var namespace = 'pomodoro-app';
    function load(){
        var result;

        try {
            if (localStorage && JSON){
                var json = localStorage.getItem(namespace);
                result = JSON.parse(json);
            }
        } catch(e){
            console.log('Could not load data.  Starting from scratch.');
        }
        return result || [];
    }
    function save(){
        try {
            if (localStorage && JSON){
                var array = this.data.tasks.slice(0);
                localStorage.setItem(namespace, JSON.stringify(array));
            }
        } catch(e){
            console.log('Could not save data.'); 
        }
    }

    var tasks = load(),
        data = {
            tasks : tasks,
            format : function(ts){
                var total = ts / 1000,
                    seconds = total % 60,
                    minutes = (total - seconds) / 60,
                    formatted = minutes + ':' + ("0" + seconds).slice(-2);
                    
                return ts ? formatted : "Complete!"; // via http://stackoverflow.com/questions/8043026/javascript-format-number-to-have-2-digit
            },
            getWidth : function(ts){
                return (1 - (ts / pomodoro)) * 100;
            },
        };

    var app = Ractive.extend({
        update : function(){
            save.call(this);
            this._super();
        }
    });

    var ractive = new app({
        el : 'application',
        template : '#pomodoro',
        data : data
    })

    // Find and trigger active tasks
    tasks.forEach(function(d){
        if (d.active){
            doStart.call(ractive, { context : d });
        }
    });
    
    ractive.on('start', doStart);
    ractive.on('new'  , doNew);
    ractive.on('reset', doReset);
    ractive.on('clear', doClear);
    
    var interval;
    function doStart(evt){
        var c = evt.context,
            increment = 1000 * 1, // Every one second
            ractive = this;

        doStop.call(this, evt);

        // Activate task in context
        this.data.active = c;
        c.active = true;

        ractive.update();

        // Begin updating status bar
        interval = setInterval(function(){
            c.remaining -= increment;
            
            if (c.remaining <= 0){
                c.remaining = 0;
                doStop.call(ractive, evt);
            }
            
            ractive.update();
            
        }, increment)
    }

    function doStop(evt){
       
        // Clear interval
        if (interval){
            clearInterval(interval);
        }

        // Deactivate others
        this.data.tasks.forEach(function(d){
            d.active = false;
        });
    }

    function doNew(evt){
        data.tasks.push({
            name : evt.node.value,
            remaining : pomodoro,
            modified : +new Date(),
            active : false
        })

        ractive.update();
    }

    function doClear(evt){
        evt.node.value = "";
    }
    
    function doReset(evt){
        this.data.tasks = [];
        this.update();
    };
})()
