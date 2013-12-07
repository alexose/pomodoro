(function(){
    var pomodoro = 1000 * 60 * 25;
   
    var data = {
        tasks : [
            { name : 'Task one' , remaining : 0 },
            { name : 'Task two' , remaining : pomodoro }, 
            { name : 'Task three' , remaining : pomodoro },
            { name : 'Task four' , remaining : 0 },
        ],
        format : function(ts){
            var total = ts / 1000,
                seconds = total % 60,
                minutes = (total - seconds) / 60;

            return minutes + ':' + (seconds || "00");
        },
        getWidth : function(ts){
            return (ts / pomodoro) * 100;
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
            remaining : pomodoro 
        })

        ractive.update();
    });
})()
