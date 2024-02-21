'use strict';

var sw_msgs = '';

if ('serviceWorker' in navigator) {
  // Delay registration until after the page has loaded, to ensure that our
  // precaching requests don't degrade the first visit experience.
  // See https://developers.google.com/web/fundamentals/instant-and-offline/service-worker/registration
  window.addEventListener('load', function() {
    // Your service-worker.js *must* be located at the top-level directory relative to your site.
    // It won't be able to control pages unless it's located at the same level or higher than them.
    // *Don't* register service worker file in, e.g., a scripts/ sub-directory!
    // See https://github.com/slightlyoff/ServiceWorker/issues/468
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      // updatefound is fired if service-worker.js changes.
      reg.onupdatefound = function() {
        // The updatefound event implies that reg.installing is set; see
        // https://w3c.github.io/ServiceWorker/#service-worker-registration-updatefound-event
        let installingWorker = reg.installing;

        installingWorker.onstatechange = function() {
          switch (installingWorker.state) {
            case 'installed':
              if (navigator.serviceWorker.controller) {
                // At this point, the old content will have been purged and the fresh content will
                // have been added to the cache.
                // It's the perfect time to display a "New content is available; please refresh."
                // message in the page's interface.
                sw_msgs = 'A new version is available.<br/>Refresh the page to update.';
              } else {
                // At this point, everything has been precached.
                // It's the perfect time to display a "Content is cached for offline use." message.
                sw_msgs = 'Content is cached for offline use';
              }
              try {
                get_screen().getElementById("msgs").textContent = sw_msgs;
                sw_msgs = '';
              } catch (e) {}
              break;

            case 'redundant':
              console.error('The installing service worker became redundant.');
              break;
          }
        };
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  });
}

/*! modernizr 3.6.0 (Custom Build) | MIT *
 * https://modernizr.com/download/?-passiveeventlisteners-touchevents !*/
!function(e,n,t){function o(e,n){return typeof e===n}function s(){var e,n,t,s,i,a,r;for(var l in f)if(f.hasOwnProperty(l)){if(e=[],n=f[l],n.name&&(e.push(n.name.toLowerCase()),n.options&&n.options.aliases&&n.options.aliases.length))for(t=0;t<n.options.aliases.length;t++)e.push(n.options.aliases[t].toLowerCase());for(s=o(n.fn,"function")?n.fn():n.fn,i=0;i<e.length;i++)a=e[i],r=a.split("."),1===r.length?Modernizr[r[0]]=s:(!Modernizr[r[0]]||Modernizr[r[0]]instanceof Boolean||(Modernizr[r[0]]=new Boolean(Modernizr[r[0]])),Modernizr[r[0]][r[1]]=s),d.push((s?"":"no-")+r.join("-"))}}function i(){return"function"!=typeof n.createElement?n.createElement(arguments[0]):p?n.createElementNS.call(n,"http://www.w3.org/2000/svg",arguments[0]):n.createElement.apply(n,arguments)}function a(){var e=n.body;return e||(e=i(p?"svg":"body"),e.fake=!0),e}function r(e,t,o,s){var r,f,l,d,u="modernizr",p=i("div"),h=a();if(parseInt(o,10))for(;o--;)l=i("div"),l.id=s?s[o]:u+(o+1),p.appendChild(l);return r=i("style"),r.type="text/css",r.id="s"+u,(h.fake?h:p).appendChild(r),h.appendChild(p),r.styleSheet?r.styleSheet.cssText=e:r.appendChild(n.createTextNode(e)),p.id=u,h.fake&&(h.style.background="",h.style.overflow="hidden",d=c.style.overflow,c.style.overflow="hidden",c.appendChild(h)),f=t(p,e),h.fake?(h.parentNode.removeChild(h),c.style.overflow=d,c.offsetHeight):p.parentNode.removeChild(p),!!f}var f=[],l={_version:"3.6.0",_config:{classPrefix:"",enableClasses:!0,enableJSClass:!0,usePrefixes:!0},_q:[],on:function(e,n){var t=this;setTimeout(function(){n(t[e])},0)},addTest:function(e,n,t){f.push({name:e,fn:n,options:t})},addAsyncTest:function(e){f.push({name:null,fn:e})}},Modernizr=function(){};Modernizr.prototype=l,Modernizr=new Modernizr;var d=[],u=l._config.usePrefixes?" -webkit- -moz- -o- -ms- ".split(" "):["",""];l._prefixes=u;var c=n.documentElement,p="svg"===c.nodeName.toLowerCase(),h=l.testStyles=r;Modernizr.addTest("touchevents",function(){var t;if("ontouchstart"in e||e.DocumentTouch&&n instanceof DocumentTouch)t=!0;else{var o=["@media (",u.join("touch-enabled),("),"heartz",")","{#modernizr{top:9px;position:absolute}}"].join("");h(o,function(e){t=9===e.offsetTop})}return t}),Modernizr.addTest("passiveeventlisteners",function(){var n=!1;try{var t=Object.defineProperty({},"passive",{get:function(){n=!0}});e.addEventListener("test",null,t)}catch(o){}return n}),s(),delete l.addTest,delete l.addAsyncTest;for(var v=0;v<Modernizr._q.length;v++)Modernizr._q[v]();e.Modernizr=Modernizr}(window,document);

const clickEvnt = Modernizr.touchevents ? "touchstart" : "click";

var N_plus = 20;
var iFrequency = 3000;
var myInterval = 0;
var N = 1;
var cfg;
var snds = [];
var stats;
var timestep_start;
var vis_stack = [];
var letter_stack = [];
var vis_clicks = [];
var letter_clicks = [];
var vis_delays = [];
var letter_delays = [];
var vis_wrong = 0; // incorrect click
var vis_misses = 0; // missed clicks
var letter_wrong = 0;
var letter_misses = 0;
var vis_hits = 0;
var letter_hits = 0;
var d_prime = 0;
var time = 0;

function compare_dates(a, b) {
    return a.getDate() === b.getDate()
        && a.getMonth() === b.getMonth()
        && a.getFullYear() === b.getFullYear();
}

function is_today(d) {
    return compare_dates(new Date(d), new Date());
}

function cloner(e) {
    let newone = e.cloneNode(true);
    e.parentNode.replaceChild(newone, e);
    return newone;
}

function set_toggle(e, state) {
    e.getElementsByTagName('rect')[0].setAttribute('fill', (state)   ? '#99ccff' : 'grey');
    e.getElementsByTagName('circle')[0].setAttribute('fill', (state) ? '#226699' : 'grey');
    e.getElementsByTagName('circle')[0].setAttribute('cx', (state)   ? '10' : '-10');
}

function replaceEventListener(e, evt, action) {
    let elm = cloner(e);
    elm.addEventListener(evt, action, Modernizr.passiveeventlisteners ? {passive: true}: false);
}

function get_screen() {
    return document.getElementById('thescreen').contentWindow.document;
}

function get_menu() {
    return document.getElementById('themenu').contentWindow.document;
}

function get_n_games() {
    let games = stats['games'];
    let gamecount = 0;
    for (let i=games.length-1; i>-1; i--) {
        if (is_today(games[i]['time'])) {
            gamecount += 1;
        } else { break; } // assumes stats array is sorted.
    }
    return gamecount;
}

function init_home() {
    document.getElementById('#play').style.display = 'block';
    replaceEventListener(get_screen().getElementById("#gear"), clickEvnt, function(e)  { window.history.pushState({'page':'config'}, '', '');  goto_config();});
    replaceEventListener(get_screen().getElementById("#help"), clickEvnt, function(e)  { window.history.pushState({'page':'help'},   '', '');  goto_help();});
    replaceEventListener(get_screen().getElementById("#graph"), clickEvnt, function(e) { window.history.pushState({'page':'stats'},  '', '');  goto_stats();});
    document.getElementById("title").textContent = `N = ${N}`;
    document.getElementById("ngames").textContent = `${get_n_games()} / 20 Today`;
    get_screen().getElementById("msgs").textContent = sw_msgs;
    sw_msgs = '';
}

function goto_home() {
    hide_menu();
    if (myInterval > 0)
        clearInterval(myInterval);
    if(! document.getElementById('thescreen').contentWindow.location.href.endsWith('/screens/home.html')) {
        document.getElementById('thescreen').contentWindow.location.replace('/screens/home.html');
        document.getElementById('thescreen').onload = function (e) { init_home(); }
    } else {
        if (document.getElementById('thescreen').contentWindow.document.readyState == 'complete')
            init_home();
        else
            document.getElementById('thescreen').onload = function (e) { init_home(); }
    }
}

function goto_help() {
    hide_menu();
    document.getElementById('#play').style.display = 'none';
    document.getElementById('thescreen').contentWindow.location.replace('/screens/help.html');
    document.getElementById('thescreen').onload = function (e) {
        replaceEventListener(get_screen().getElementById("#back"), clickEvnt, function(e) { window.history.back(); });
    }
}

function goto_game(callback) {
    hide_menu();
    window.addEventListener("keypress", keypress);
    document.getElementById('#play').style.display = 'none';
    document.getElementById('thescreen').contentWindow.location.replace('/screens/game.html');
    document.getElementById('thescreen').onload = function (e) {
        get_screen().getElementById("title").textContent = `N = ${N}`;
        replaceEventListener(get_screen().getElementById("vis_button"), clickEvnt, function(e) {  vis_click();});
        replaceEventListener(get_screen().getElementById("letter_button"), clickEvnt, function(e) { letter_click();});
        replaceEventListener(get_screen().getElementById("#back"), clickEvnt, function(e) {
            _paq.push(['trackEvent', 'Game', 'Exit', N]);
            window.history.back();
        });

        callback();
    }
}
function keypress(e){
    var keynum;
    if(window.event) { // IE
        keynum = e.keyCode;
    } else if(e.which){ // Netscape/Firefox/Opera
        keynum = e.which;
    }
    keynum = String.fromCharCode(keynum);
    if(keynum == "a"){
        vis_click();
    } else if (keynum == ";"){
        letter_click();
    }
}

function goto_score() {
    hide_menu();
    document.getElementById('#play').style.display = 'none';
    document.getElementById('thescreen').contentWindow.location.replace('/screens/score.html');
    document.getElementById('thescreen').onload = function (e) {
        replaceEventListener(get_screen().getElementById("#back"), clickEvnt, function(e) {  window.history.back(); });
        replaceEventListener(get_screen().getElementById("#play"), clickEvnt, function(e) {  start_game(true); });

        get_screen().getElementById("vis_hits").textContent      = ""+vis_hits;
        get_screen().getElementById("vis_misses").textContent    = ""+vis_misses;
        get_screen().getElementById("vis_wrong").textContent     = ""+vis_wrong;
        get_screen().getElementById("letter_hits").textContent   = ""+letter_hits;
        get_screen().getElementById("letter_misses").textContent = ""+letter_misses;
        get_screen().getElementById("letter_wrong").textContent  = ""+letter_wrong;

        if (d_prime > 0.85) {
            get_screen().getElementById("title").style.color = 'green';
            get_screen().getElementById("level").style.fill = 'green';
        } else if (d_prime < 0.7) {
            get_screen().getElementById("title").style.color = 'red';
            get_screen().getElementById("level").style.fill = 'red';
        } else {
            get_screen().getElementById("title").style.color = 'black';
            get_screen().getElementById("level").style.fill = 'black';
        }

        get_screen().getElementById("title").textContent = `d' = ${Math.round(d_prime*100)}%`;
        get_screen().getElementById("level").textContent = `N = ${N}`;
        get_screen().getElementById("ngames").textContent = `${get_n_games()} / 20 Today`;

        let twitter_text = encodeURIComponent(`I made it to N=${N}!`);
        let twitter_link = encodeURIComponent('https://dual-n-back.io/');
        get_screen().getElementById('twitter_share').setAttribute('href',
            `https://twitter.com/intent/tweet/?text=${twitter_text}&url=${twitter_link}`);
    }
}

function goto_stats() {
    hide_menu();
    document.getElementById('#play').style.display = 'none';
    document.getElementById('thescreen').contentWindow.location.replace('/screens/stats.html');
    document.getElementById('thescreen').onload = function (e) {
        replaceEventListener(get_screen().getElementById("#back"), clickEvnt, function(e) { window.history.back(); });
    }
}

function goto_config() {
    document.getElementById('themenu').contentWindow.location.replace('/screens/config.html');
    document.getElementById('themenu').onload = function (e) {
        replaceEventListener(get_menu().getElementById("#download_stats"), clickEvnt,   download_stats);
        replaceEventListener(get_menu().getElementById("#do_n_reset"), clickEvnt,       reset_n);
        replaceEventListener(get_menu().getElementById("#clear_storage"), clickEvnt,    clear_storage_btnclk);
        replaceEventListener(get_menu().getElementById("#upload_stats"), "change",      upload_cfg);
        replaceEventListener(get_menu().getElementById("#back"), clickEvnt,             go_back);
        replaceEventListener(get_menu().getElementById("reset_n"), clickEvnt,           toggle_reset_n);
        set_toggle(get_menu().getElementById("reset_n"), cfg["reset_n"]);
        show_menu();
    }
}

function show_menu() {
    document.getElementById('shader').style.opacity = '0.5';
    document.getElementById('themenu').style.width = '60%';
}

function hide_menu() {
    document.getElementById('shader').style.opacity = '0';
    document.getElementById('themenu').style.width = '0';
}

function toggle_reset_n() {
    cfg["reset_n"] = !cfg["reset_n"];
    set_toggle(get_menu().getElementById("reset_n"), cfg["reset_n"]);
    localStorage.setItem('config', JSON.stringify(cfg));
}

function reset_n() {
    N = 1;
    localStorage.setItem("N", 1);
}

function go_back() {
    window.history.back();
}

function download_stats() {
    let elm = cloner(get_menu().getElementById('#download_stats'));
    elm.style.webkitAnimationPlayState = 'running';
    elm.style.animationPlayState = 'running';

    let backups = { "N": N, "stats": stats };
    let blob = new Blob([JSON.stringify(backups)], {type: "text"});
    let element = get_screen().createElement('a');
    element.setAttribute('href', URL.createObjectURL(blob));
    element.setAttribute('download', "N-Back_Stats"+(new Date()).toJSON()+".json");
    element.style.display = 'none';
    get_screen().body.appendChild(element);
    element.click();
    get_screen().body.removeChild(element);
}

function upload_cfg(event) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        let f = event.target.files[0];
        if (f) {
            let r = new FileReader();
            r.addEventListener("load", function(event) {
                let asjson = JSON.parse(event.target.result);
                stats = asjson["stats"];
                N = asjson["N"];
                localStorage.setItem("stats", JSON.stringify(stats));
                localStorage.setItem("N", N);
            });
            r.readAsText(f);
        }
    } else {
        alert('This functionality not supported by your browser.');
    }
}

function do_clear_storage() {
    try {
        localStorage.removeItem("stats");
        localStorage.removeItem('config');
    } catch(err) {}
    cfg = { "reset_n": false };
    stats = { "games": [] };
    N = 1;
}

function clear_storage_btnclk() {
    if (confirm('Really clear all app data?')) {
        let elm = cloner(get_menu().getElementById('#clear_storage'));
        elm.style.webkitAnimationPlayState = 'running';
        elm.style.animationPlayState = 'running';
        do_clear_storage();
    }
}

function set_active(box) {
    if (box >= 0 && box < 8) {
        let elm = cloner(get_screen().getElementsByClassName('box')[box]);
        elm.style.webkitAnimationPlayState = 'running';
        elm.style.animationPlayState = 'running';
    }
}

function vis_click() {
    let delay = Date.now() - timestep_start;
    vis_delays.push(delay);
    vis_clicks.push(time-1);
    get_screen().getElementById('vis_button').style.backgroundColor = '#609f9f';
}

function letter_click() {
    let delay = Date.now() - timestep_start;
    letter_delays.push(delay);
    letter_clicks.push(time-1);
    get_screen().getElementById('letter_button').style.backgroundColor = '#609f9f';
}

function is_in(a, b) {
    for (let i=0; i<b.length; i++)
        if (a == b[i])
            return true;
    return false;
}

function update_stats() {
    let entry = { "time": (new Date()).toJSON(), "N": N,
        "vStack": vis_stack, "vClicks": vis_clicks, "vDelays": vis_delays,
        "lStack": letter_stack, "lClicks": letter_clicks, "lDelays": letter_delays,
        "v": 1.0 };
    stats["games"].push(entry);
    localStorage.setItem("stats", JSON.stringify(stats));
}

function calc_score() {
    vis_wrong = 0;
    vis_misses = 0;
    letter_wrong = 0;
    letter_misses = 0;
    vis_hits = 0;
    letter_hits = 0;
    for (let i=N; i<vis_stack.length; i++) {
        if (vis_stack[i] == vis_stack[i-N]) {
            if (vis_clicks.indexOf(i) > -1) {
                vis_hits += 1;
            } else {
                vis_misses += 1;
            }
        } else {
            if (vis_clicks.indexOf(i) > -1) {
                vis_wrong += 1;
            }
        }
        if (letter_stack[i] == letter_stack[i-N]) {
            if (letter_clicks.indexOf(i) > -1) {
                letter_hits += 1;
            } else {
                letter_misses += 1;
            }
        } else {
            if (letter_clicks.indexOf(i) > -1) {
                letter_wrong += 1;
            }
        }
    }

    let hit_rate = (vis_hits/6.0 + letter_hits/6.0)/2.0;
    let false_alarm_rate = (vis_wrong/(vis_stack.length-6) + letter_wrong/(vis_stack.length - 6))/2.0;
    d_prime = hit_rate - false_alarm_rate;

    if (d_prime > 0.85) {
        _paq.push(['trackEvent', 'Game', 'Win', N]);
        return 1;
    } else if (d_prime < 0.7) {
        _paq.push(['trackEvent', 'Game', 'Lose', N]);
        return -1;
    } else {
        _paq.push(['trackEvent', 'Game', 'Nochange', N]);
        return 0;
    }
}

function do_timestep() {
    get_screen().getElementById('vis_button').style.backgroundColor = '#d9d9d9';
    get_screen().getElementById('letter_button').style.backgroundColor = '#d9d9d9';
    if (time < vis_stack.length) {
        set_active(vis_stack[time]);
        timestep_start = Date.now();
        snds[letter_stack[time]].currentTime = 0;
        snds[letter_stack[time]].play();
        time += 1;
    } else {
        set_active(-1);
        clearInterval(myInterval);
        update_stats();
        N = Math.max(1, N+calc_score());
        localStorage.setItem("N", N);
        // show score
        window.history.replaceState({'page':'score'}, '', '');
        goto_score();
    }
}

function build_stacks() {
    let next = -1;

    let visual_matches = [];
    let auditory_matches = [];
    // Choose four random timesteps in which there will be a
    // visual match
    while (visual_matches.length < 4) {
        next = Math.floor(Math.random()*(N_plus));
        if (visual_matches.indexOf(next+N) == -1)
            visual_matches.push(next+N);
    }
    // Choose four random timesteps in which there will be an
    // auditory match
    while (auditory_matches.length < 4) {
        next = Math.floor(Math.random()*(N_plus));
        if (auditory_matches.indexOf(next+N) == -1 && visual_matches.indexOf(next+N) == -1)
            auditory_matches.push(next+N);
    }

    // Choose two random timesteps in which there is a double match
    while (auditory_matches.length < 6) {
        next = Math.floor(Math.random()*(N_plus));
        if (auditory_matches.indexOf(next+N) == -1 && visual_matches.indexOf(next+N) == -1) {
            auditory_matches.push(next+N);
            visual_matches.push(next+N);
        }
    }

    let visual_stack = [];
    let auditory_stack = [];
    // Randomly assign first N rounds
    while (visual_stack.length < N) {
        next = Math.floor(Math.random()*(8));
        if (visual_stack.indexOf(next) == -1)
            visual_stack.push(next);
    }
    while (auditory_stack.length < N) {
        next = Math.floor(Math.random()*(10));
        if (auditory_stack.indexOf(next) == -1)
            auditory_stack.push(next);
    }
    // Now add random positions to the stack until it's full.
    // Make sure that unless this is one of the selected timesteps
    // from earlier, that each position is not the same as the one
    // N steps ago.
    while (visual_stack.length < N_plus+N) {
        if (visual_matches.indexOf(visual_stack.length) != -1) {
            visual_stack.push(visual_stack[visual_stack.length-N]);
        } else {
            next = Math.floor(Math.random()*(7));
            if (next >= visual_stack[visual_stack.length-N])
                next += 1;
            visual_stack.push(next);
        }
    }

    while (auditory_stack.length < N_plus+N) {
        if (auditory_matches.indexOf(auditory_stack.length) != -1) {
            auditory_stack.push(auditory_stack[auditory_stack.length-N]);
        } else {
            next = Math.floor(Math.random()*(9));
            if (next >= auditory_stack[auditory_stack.length-N])
                next += 1;
            auditory_stack.push(next);
        }
    }

    return [visual_stack, auditory_stack];
}

function load_snds() {
    if (snds.length == 0) {
        let clips = ['/audio/B', '/audio/C', '/audio/D', '/audio/G', '/audio/H',
            '/audio/K', '/audio/P', '/audio/Q', '/audio/T', '/audio/W'];

        if (document.createElement('audio').canPlayType('audio/ogg'))
            for (let i=0; i<clips.length; i++) {
                let clip = document.createElement('audio');
                clip.setAttribute('src',  clips[i]+'.ogg');
                snds.push(clip);
            }
        else if (document.createElement('audio').canPlayType('audio/mpeg'))
            for (let i=0; i<clips.length; i++) {
                let clip = document.createElement('audio');
                clip.setAttribute('src',  clips[i]+'.mp3');
                snds.push(clip);
            }
        else
            for (let i=0; i<clips.length; i++) {
                let clip = document.createElement('audio');
                clip.setAttribute('src',  clips[i]+'.wav');
                snds.push(clip);
            }
    }
}

function start_game(isRestart) {
    _paq.push(['trackEvent', 'Game', (isRestart ? 'Restart' : 'Start'), N]);
    if (isRestart)
        window.history.replaceState({'page':'game'}, '', '');
    else
        window.history.pushState({'page':'game'}, '', '');

    //load_snds();
    for (let i=0; i<snds.length; i++) {
        snds[i].load();
        snds[i].volume = 0.65;
    }

    let stacks = build_stacks(N);
    vis_stack = stacks[0];
    letter_stack = stacks[1];

    vis_clicks = [];
    letter_clicks = [];
    vis_delays = [];
    letter_delays = [];
    time = 0;
    goto_game(function() {
        // Start game
        myInterval = setInterval(do_timestep, iFrequency);  // run
    });
}

window.onpopstate = function(event) {
    //console.log("location: " + location.href + ", data: " + JSON.stringify(event.state));
    if (event.state == null || event.state['page'] == 'home')
        goto_home();
    else if (event.state['page'] == 'score')
        goto_score();
    else if (event.state['page'] == 'help')
        goto_help();
    else if (event.state['page'] == 'stats')
        goto_stats();
};

window.addEventListener("load", function() {
    try { stats = JSON.parse(localStorage.getItem("stats")); } catch (err)  { }
    try { N = parseInt(localStorage.getItem("N")); }           catch (err)  { }
    try { cfg = JSON.parse(localStorage.getItem("config")); }  catch (err)  { }

    if (!stats) stats = { 'games': [] };
    if (!N)     N = 1;
    if (!cfg)   cfg = { 'reset_n': false };

    if (stats['games'].length > 0) {
        let latest_game = stats['games'][stats['games'].length-1];
        if (cfg['reset_n'] && !is_today(latest_game['time'])) {
            N = 1;
        }
    }

    window.history.pushState({'page':'home'}, '', '');
    goto_home();
    load_snds();
});
