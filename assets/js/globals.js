window.chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
};

var config = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            fill: true,
            label: "",
            backgroundColor: window.chartColors.grey,
            borderColor: '#777777',
            data: []
        }],
    },
    options: {
        responsive: true,
        title: {
            display: false,
            text: ''
        },
        tooltips: {
            mode: 'index',
            intersect: true
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Temps en s'
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: ''
                }
            }]
        }
    }
}

var config1 = {
    type: 'doughnut',
    data: {
        datasets: [{
            data: [],
            backgroundColor: [
                window.chartColors.green,
                window.chartColors.red
            ],
            label: 'Mémoire'
        }],
        labels: [
            'Mémoire libre',
            'Mémoire utilisée'
        ]
    },
    options: {
        responsive: true,
        legend: {
            position: 'top',
        },
        title: {
            display: true,
            text: 'Charge mémoire'
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    }
};