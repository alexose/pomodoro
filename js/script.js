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

    var data = {
        tasks : load(),
        format : function(ts){
            var total = ts / 1000,
                seconds = total % 60,
                minutes = (total - seconds) / 60;

            return minutes + ':' + ("0" + seconds).slice(-2); // via http://stackoverflow.com/questions/8043026/javascript-format-number-to-have-2-digit
        },
        getWidth : function(ts){
            return (1 - (ts / pomodoro)) * 100;
        },
    };

    // TODO: trigger active

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
    
    ractive.on('start', function(evt){

        var c = evt.context,
            interval = 1000 * 1, // Every one second
            ractive = this;

        this.data.active = c;
        c.active = true;

        ractive.update();

        // Begin updating status bar
        var id = setInterval(function(){
            c.remaining -= interval;
            
            ractive.update();
            
            if (c.remaining >= pomodoro){
                c.remaining = pomodoro;
                clearInterval(id);
            }
        }, interval)
    });

    ractive.on('new', function(evt){
        data.tasks.push({
            name : evt.node.value,
            remaining : pomodoro,
            date : +new Date(),
            active : false
        })

        ractive.update();
    });

    ractive.on('clear', function(evt){
        evt.node.value = "";
    });
    
    ractive.on('reset', function(evt){
        this.data.tasks = [];
        this.update();
    });
})()
