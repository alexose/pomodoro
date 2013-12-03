(function(){
    var data = {
        time : '25:00',
        tasks : [
            { name : 'Task one' , completed : false },
            { name : 'Task two' , completed : true },
            { name : 'Task three' , completed : true },
            { name : 'Task four' , completed : false },
        ]
    }

    var ractive = new Ractive({
        el : 'application',
        template : '#pomodoro',
        data : data
    })
})()
