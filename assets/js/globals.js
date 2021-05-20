window.chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgba(201, 203, 207,0.2)'
};

var config = {
    type: 'line',
    data: {
        labels: ['14','13','12','11','10','9','8','7','6','5','4','3','2','1','0'],
        datasets: [{
            fill: true,
            backgroundColor: window.chartColors.grey,
            borderColor: '#777777',
            data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        }],
    },
    options: {
        responsive: false,
        title: {
            display: false,
        },
        animation: {
            duration: 0
        },
        elements: {
            point: {
                radius: 0
            },
            line: {
            	borderWidth: 1,
            	tension: 0,
            	backgroundColor: window.chartColors.grey
            },
            bar: {
            	borderWidth: 0
            }
        },
        legend: {
        	display: false
        },
        tooltips: {
        	enabled: false
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
                },
            }],
            yAxes: [{
                display: true,
                ticks: {
		          autoSkip: false,
		          min: 0,
		          max: 100
		        },
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
            text: 'Utilisation de la mémoire'
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    }
};