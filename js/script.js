(function(){
    var pomodoro = 1000 * 60 * 25;
   
    var data = {
        tasks : [
            { name : 'Task one' , remaining : 0, active : false },
            { name : 'Task two' , remaining : pomodoro, active : false }, 
            { name : 'Task three' , remaining : pomodoro, active : false },
            { name : 'Task four' , remaining : 0, active: false },
        ],
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

    var ractive = new Ractive({
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
            active : false
        })

        ractive.update();
    });
})()
