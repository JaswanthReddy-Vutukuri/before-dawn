var React = require('react');
var ReactDOM = require('react-dom');
var Slider = require('rc-slider');

var _ = require('lodash');

$ = jQuery = require('../bower_components/jquery/dist/jquery.min.js');


$(document).ready(function() {
    var remote = window.require('remote');
    var savers = remote.getGlobal('savers');
    var saverOpts = {};

    var url_opts = {
        width: $("#preview").width(),
        height: $("#preview").height(),
        preview: 1
    };

    // if the preview div didn't have a height, figure one out by getting
    // the width and making it proprtional to the main screen. at the moment,
    // the div will never have a height at this point unless someone specifically
    // hacks the CSS to make it work differently
    if ( url_opts.height == 0 ) {
        var atomScreen = window.require('screen');
        var size = atomScreen.getPrimaryDisplay().bounds;
        var ratio = size.height / size.width;
        url_opts.height = url_opts.width * ratio;
        console.log("setting preview opts to", url_opts);
    }


    $("select[name=delay] option[value=" + savers.getDelay() + "]").attr("selected", "selected");
    if ( savers.getLock() === true ) {
        $("input[name=lock_screen][type=checkbox]").attr("checked", "checked");
    }

    var SaverList = React.createClass({
        getInitialState: function() {
            return {
                value: this.props.current
            };
        },
        onChanged: function (e) {
            this.setState({
                key: e.currentTarget.value
            });
        },
        handleChange: function(event) {
            this.setState({value: event.target.value});
        },
        render: function() {
            var self = this;
            var nodes = this.props.data.map(function(s, i) {
                var is_checked = (s.key === self.state.value);
                return (
                    <div className={"entry"} key={i}>
                    <h1>{s.name}</h1>
                    <div className={"body"}>
                    <input type="radio" name="screensaver" value={s.key} onChange={this.onChanged} defaultChecked={is_checked} />
                    {s.description}
                </div>
                    </div>
                );
            });

            return(<div>{nodes}</div>);
        }
    });

    var Preview = React.createClass({
        render: function() {
            var s = this.props.saver;
            console.log("CURRENT", s.settings);

            var mergedOpts = _.merge(url_opts, s.settings);

            console.log("OPTS", saverOpts);
            mergedOpts = _.merge(mergedOpts, saverOpts);

            console.log("PREVIEW", mergedOpts);

            var previewUrl = s.getPreviewUrl(mergedOpts);

            return (
                <div>
                    <iframe scrolling='no' src={previewUrl} />
                    </div>
            );
        }
    });

    var Details = React.createClass({
        render: function() {
            var s = this.props.saver;
            return (
                <div>
      <h1>{s.name}</h1>
      <h2>{s.author}</h2>
      <p>{s.description}</p>     
      <a href={s.aboutUrl}>{s.aboutUrl}</a>
                    </div>
            );
        }
    });

    var SliderWithValue = React.createClass({
        onSliderChange: function(val) {
            this.value = val;
            this.setState({
                name: this.name,
                value: val
            });

            this.props.onChange({
                name: this.props.name,
                value: val
            });
        },
        render: function() {
            return <Slider defaultValue={this.props.value} onChange={this.onSliderChange} />;
        }
    });

    var OptionsForm = React.createClass({
        values: {},
        onChanged: function(e) {
            this.props.onChange(this.getValues());
        },
        renderOption: function(o, index, val) {
            var guts;
            var self = this;
            var ref = "option" + index;

            if ( o.type === "slider" ) {
                val = parseInt(val, 10);
                console.log("VAL", val, typeof(val));
                guts = <SliderWithValue name={o.name} value={val} min={o.min} max={o.max} ref={ref} onChange={this.onChanged} />;
            }
            else {
                guts = <input type="text" name={o.name} defaultValue={val} ref={ref} onChange={this.onChanged} />;
            }

            return (
                    <fieldset>
                    <legend>{o.name}</legend>
                    {guts}
                </fieldset>
            );
        },
        getValues: function() {
            var self = this;
            var data = {};
            _.each(this.props.saver.options, function(o, i) {
                var ref = "option" + i;
                data[o.name] = self.refs[ref].value;
            });

            return data;
        },
        render: function() {
            var self = this;
            var s = this.props.saver;
            var onChange = this.props.onChange;
            var values = s.settings;
            
            var nodes = this.props.saver.options.map(function(o, i) {
                var val = values[o.name];
                console.log("CHECK " + o.name + " -> " + val);
                if ( typeof(val) === "undefined" ) {
                    console.log('use default!');
                    val = o.default;
                }

                console.log(o.name + " -> " + val);

                return (
                    <div key={i}>
                    {self.renderOption(o, i, val)}
                    </div>
                );
            });

            return(<div>{nodes}</div>);
        }
    });


    var loadPreview = function(s) {
        ReactDOM.render(
                <Preview saver={s} />,
            document.getElementById('preview')
        );
    };

    var loadDetails = function(s) {
        /*ReactDOM.render(
                <Details saver={s} />,
            document.getElementById('details')           
        );*/   
    };

    var optionsUpdated = function(data) {
        saverOpts = data;
        console.log("updated!");

        var current = savers.getCurrent();
        var s = savers.getByKey(current);
        redraw(s);        
    };

    var loadOptionsForm = function(s) {
        ReactDOM.render(
                <OptionsForm saver={s} onChange={optionsUpdated} />,
            document.getElementById('options')
        );   
    };

    var closeWindow = function() {
        var window = remote.getCurrentWindow();
        window.close();
    };

    var redraw = function(s) {
        loadPreview(s);
        loadOptionsForm(s);
        loadDetails(s);
    };

    var renderList = function() {
        savers.listAll(function(entries) {
            var current = savers.getCurrent();
            console.log("current selection", current);
            
            ReactDOM.render(
                    <SaverList current={current} data={entries} />,
                document.getElementById('savers')
            );   

            var s = savers.getByKey(current);
            redraw(s);
        });
    };

    $("body").on("change", "input[name=screensaver]", function() {
        var val = $("input[name=screensaver]:checked").val();
        var s = savers.getByKey(val);

        saverOpts = s.settings;
        console.log("EXISTING SETTINGS", saverOpts);
        redraw(s);
    });

    $("a.cancel").on("click", function(e) {
        closeWindow();
    });

    $("a.save").on("click", function(e) {
        var delay = $("select[name=delay] option:selected").val();
        var do_lock = $("input[name=lock_screen][type=checkbox]").is(":checked");
        var val = $("input[name=screensaver]:checked").val();

        console.log("set screensaver to " + val);
        savers.setCurrent(val, saverOpts);

        delay = parseInt(delay, 10);
        savers.setDelay(delay);
        savers.setLock(do_lock);

        savers.write(function() {
            closeWindow();
        });
    });

    $("a.updater").on("click", function(e) {
        var updater = window.require('updater.js');
        updater.init(basePath);

        var didUpdate = function(x) {
            $(".update-results").html("Hooray for updates!");
            renderList();
        };
        var noUpdate = function(x) {
            $(".update-results").html("No updates!");
        };

        updater.updateAll(didUpdate, noUpdate);
    });

    renderList();

});