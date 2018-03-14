'use strict';

var stats = {'games': []};

function gaussian_smooth(a, n) {
    if (n < 0.52) return a;
    // mirror the array, with opposite sign (y-shifted to match at ends)
    // in order to preserve values at the ends.
    var mirrored = [];
    for (var i=0;i<a.length;i++)
        mirrored.push(2*a[0]-a[a.length-1-i]);
    for (var i=0;i<a.length;i++)
        mirrored.push(a[i]);
    for (var i=0;i<a.length;i++)
        mirrored.push(2*a[a.length-1]-a[a.length-1-i]);

    var ret = [];
    for (var i=a.length;i<2*a.length;i++) {
        var integral = 0;
        for (var j=0; j<mirrored.length; j++)
            integral += Math.exp(-Math.pow((i-j),2)/n) * mirrored[j];
        ret.push(integral / Math.sqrt(3.14159*n)); // sqrt(pi)
    }
    return ret;
}

function plot_level_v_time(stats) {
    // everyone starts at 1
    var X = [];
    var Y = [];
    var nmax = 0;
    // get N from each game. Add increment to X.
    for (var i=0;i<stats['games'].length; i++) {
        X.push(i+1);
        var N = stats['games'][i]['N'];
        Y.push(N);
        if (N > nmax)
            nmax = N;
    }

    if (X.length == 0)
        return false;

    try {
        var N = JSON.parse(localStorage.getItem("N"));
        X.push(X[X.length-1]+1);
        Y.push(N);
        if (N > nmax)
            nmax = N;
    } catch (err) {}

    document.getElementById("levelhistdiv").style.display = 'block';

    Y = gaussian_smooth(Y, Y.length/150);
    var datas = [];
    for (var i=0;i<X.length;i++) {
        datas.push({'x': X[i], 'y': Y[i]});
    }


    var ctx = document.getElementById("level_v_time").getContext("2d");
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: datas,
                backgroundColor: ['rgba(54, 162, 235, 0.2)'],
                borderColor: ['rgba(54, 162, 235, 1)'],
                borderWidth: 1,
                pointRadius: (datas.length < 60 ? 3 : 0)
            }],
        },
        options: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: 'Level History'
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    scaleLabel: {
                        display: true,
                        labelString: 'N'
                    },
                    ticks: {
                        beginAtZero: true,
                        min: 0,
                        max: nmax+1,
                        stepSize: 1,
                        autoSkip: true
                    }
                }],
                xAxes: [{
                    type: 'linear',
                    ticks: {
                        min: 0,
                        max: X[X.length-1]+1,
                        autoSkip: true
                    },
                    scaleLabel: {
                        display: false,
                        labelString: 'Game Number'
                    }
                }]
            }
        }
    });
}

function plot_avg_click_delays(stats) {
    var audiodelays = [];
    var visualdelays = [];
    for (var i=0;i<stats['games'].length; i++) {
        if (stats['games'][i].hasOwnProperty('v') && stats['games'][i]['v'] >= 1.0) {
            var N = stats['games'][i]['N'];
            while (audiodelays.length < N) {
                audiodelays.push([]);
                visualdelays.push([]);
            }
            audiodelays[N-1] = audiodelays[N-1].concat(stats['games'][i]['lDelays']);
            visualdelays[N-1] = visualdelays[N-1].concat(stats['games'][i]['vDelays']);
        }
    }

    if (audiodelays.length == 0) {
        return false;
    }

    document.getElementById("clickdelaydiv").style.display = 'block';

    var levels = []
    var meanaudiodelays = [];
    var meanvisualdelays = [];
    for (var i=0;i<audiodelays.length;i++) {
        levels.push(i+1);
        if (audiodelays[i].length > 0) {
            var thisamean = 0;
            for (var j=0;j<audiodelays[i].length;j++)
                thisamean += audiodelays[i][j];
            meanaudiodelays.push(thisamean/(audiodelays[i].length));
        } else {
            meanaudiodelays.push(NaN);
        }
        if (visualdelays[i].length > 0) {
            var thisvmean = 0;
            for (var j=0;j<visualdelays[i].length;j++)
                thisvmean += visualdelays[i][j];
            meanvisualdelays.push(thisvmean/(visualdelays[i].length));
        } else {
            meanvisualdelays.push(NaN);
        }
    }

    var ctx = document.getElementById("avg_click_delay").getContext("2d");
    var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels,
            datasets: [{
                label: 'Auditory',
                data: meanaudiodelays,
                backgroundColor: 'rgba(54, 54, 235, 0.7)',
                borderColor: 'rgba(54, 54, 235, 1)',
                borderWidth: 1,
                pointRadius: 10
            },{
                label: 'Visual',
                data: meanvisualdelays,
                backgroundColor: 'rgba(120, 162, 54, 0.7)',
                borderColor: 'rgba(120, 162, 54, 1)',
                borderWidth: 1,
                pointRadius: 10
            }]
        },
        options: {
            title: {
                display: true,
                text: 'Average Click Delay'
            },
            scales: {
                yAxes: [{
                    type: 'linear',
                    scaleLabel: {
                        display: true,
                        labelString: 'Delay (milliseconds)'
                    },
                    ticks: {
                        autoSkip: true,
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    type: 'category',
                    ticks: {
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'N'
                    }
                }]
            }
        }
    });
}

window.onload = function() {
    try {
        stats = JSON.parse(localStorage.getItem("stats"));
    } catch (err)  {}

    if (!stats) {
        document.getElementById("content").innerHTML = 'No data to plot.';
    } else {
        plot_level_v_time(stats);
        plot_avg_click_delays(stats);
    }
}
