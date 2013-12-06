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
            return ts;
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
        console.log(evt);
    });

    ractive.on('new', function(evt){
        data.tasks.push({
            name : evt.node.value,
            remaining : 0
        })

        ractive.update();
    });
})()
