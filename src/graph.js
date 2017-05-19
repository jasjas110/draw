var colors = {
  'bian-1': 'rgba(0, 255, 0, 0.25)',
  'bian-2': 'rgba(0, 255, 0, 0.35)',
  'ma-1': 'rgba(0, 0, 255, 0.25)',
  'ma-2': 'rgba(0, 0, 255, 0.35)',
  'tsai-1': 'rgba(0, 255, 0, 0.25)',
};
var presidents = {
  'bian': '陳水扁',
  'ma': '馬英九',
  'tsai': '蔡英文',
};
var mxGraph = {
  props: {
    id: String,
    props: Object,
  },
  data: function() {
    return {
      el: {},
      size: {},
      rows: {},
      util: {
        axes: {
          x: {},
          y: {},
        },
        sequence: {
          label: {},
        },
      },
    }
  },
  computed: {
    score: function() {
      if(!(this.rows &&this.rows.user))
        return 87;

      var self = this;
      var s = 0.2;
      var y = s*(this.props.axes.y.max - this.props.axes.y.min);
      var n = 0;
      var d = 0;
      var sum = 0;
      this.rows.user.forEach(function(row, i) {
        if(!row.fix) {
          n = n + 1;
          if(row.show) {
            d = Math.abs(row.y - self.rows.orig[i].y);
            sum = sum + (1 - (d > y ? y : d)/y)*100;
          }
        }
      });
      return n == 0 ? 0 : Math.round(sum/n);
    },
  },
  methods: {
    drawComp: function(i, title) {
      this.drawPath(this.el.comp[i], this.rows.comp[i], title);
    },
    drawUser: function() {
      this.drawPath(this.el.user, this.rows.user);
    },
    drawOrig: function() {
      this.drawPath(this.el.orig, this.rows.orig)
    },
    drawPath: function(el, points, title) {
      // https://github.com/d3/d3-selection/blob/master/README.md#selection_data
      // General Update Pattern
      // select → data → exit → remove → enter → append → merge
      var self = this;

      // find segments
      var segments = [];
      var currentSegment = [];
      for(var point of points) {
        if(!point.show) {
          if(currentSegment.length > 0)
            segments.push(currentSegment);
          currentSegment = [];
        }
        else {
          currentSegment.push(point);
        }
      }
      if(currentSegment.length > 0)
        segments.push(currentSegment);

      // draw path
      var paths = el.selectAll('path').data(segments);
      paths.exit().remove();
      paths.enter().append('path').merge(paths).attr('d', this.util.line);

      // draw circles
      var circles = el.selectAll('circle').data(points, function(d) { return d.x; });
      circles.exit().remove();
      circles.enter().append('circle').merge(circles)
        .attr('r', this.size.r)
        .attr('cx', function(d) { return self.util.axes.x.scale(d.x); })
        .attr('cy', function(d) { return self.util.axes.y.scale(d.y); })
        .classed('fix', function(d) { return d.fix; })
        .classed('hide', function(d) { return !d.show; });

      // draw labels
      var endpoints = segments.reduce(function(acc, cur) {
        return acc.concat([cur[0], cur[cur.length - 1]]);
      }, []);
      var labels = el.selectAll('text.data').data(endpoints, function(d) { return d.x; });
      labels.exit().remove();
      labels.enter().append('text').merge(labels)
        .text(function(d) { return self.util.sequence.label.format(d.y); })
        .attr('x', function(d) { return self.util.axes.x.scale(d.x); })
        .attr('y', function(d) { return self.util.axes.y.scale(d.y) - self.size.r*2; })
        .attr('class', 'data')
        .classed('hide', function(d) { return !d.show; });

      if(!!title) {
        var anchor = 2;
        el.append('text')
          .attr('class', 'title')
          .attr('x', this.util.axes.x.scale(points[anchor].x))
          .attr('y', this.util.axes.y.scale(points[anchor].y))
          .attr('dx', '0.5em')
          .text(title);
      }
    },
    init: function() {
      var size = this.size;
      var util = this.util;
      var props = this.props;

      // calculations
      size.w = 480;
      size.h = 480;
      size.r = 4;
      size.a = size.h/size.w;
      size.p = size.r*8;

      // containers
      this.el.container = d3.select(this.$el).select('.draw');

      // x & y scale
      util.axes.x.values = this.rows.user.map(function(d) { return d.x; });
      util.axes.x.scale = d3.scalePoint()
        .domain(util.axes.x.values)
        .range([size.p, size.w - size.p]);
      util.axes.y.scale = d3.scaleLinear()
        .domain([props.axes.y.min, props.axes.y.max])
        .range([size.h - size.p, 0 + size.p]);

      util.sequence.label.format = function(d) {
        return d3.format(props.sequence.label.formatString)(d/props.axes.y.divider);
      };

      // function for generating path between points
      util.line = d3.line()
        .x(function(d) { return util.axes.x.scale(d.x); })
        .y(function(d) { return util.axes.y.scale(d.y); });

      // x axis
      util.axes.x.axis = d3.axisBottom(util.axes.x.scale)
        .tickSize(size.h - size.p*2);
      util.axes.x.customize = function(g) {
        g.call(util.axes.x.axis);
        g.select('.domain').remove();
        g.selectAll('.tick').each(function(d, i, nodes) {
          var tick = d3.select(this);
          tick.select('line')

          tick.selectAll('text').remove();
          var text = tick.append('g')
            .attr('transform', 'translate(' + [-util.axes.x.scale.step()/2, size.h - size.p - size.r*8 + 2].join(',') + ')');

          // omit year when repeat
          if(d.indexOf('/') > -1) {
            var [y, m] = d.split('/');
            var target = this.previousSibling;
            while(!!target && d3.select(target).datum().indexOf('/') < 0) {
              target = target.previousSibling;
            }
            if(!(!!target && d3.select(target).datum().indexOf(y) > -1)) {
              text.append('text')
                .attr('dy', '2em')
                .text(y);
            }
            d = m;
          }
          if(d % 2 == (nodes.length % 2 == 0 ? 0 : 1))
            return;
          text.append('text')
            .text(d + (!this.nextSibling ? props.axes.x.label : ''))
            .attr('dy', '1em');
        })
      };

      // y axis
      util.axes.y.format = function(d) {
        return d3.format(props.axes.y.formatString)(d/props.axes.y.divider);
      };
      util.axes.y.axis = d3.axisRight(util.axes.y.scale)
        .tickSize(0)
        .tickValues(this.props.axes.y.ticks)
        .tickFormat(function(d) {
          // format + unit at last tick
          return util.axes.y.format(d);
        });
      util.axes.y.customize = function(g) {
        g.call(util.axes.y.axis);
        g.select('.domain').remove();
        g.selectAll('.tick > text')
          .attr('x', 0)
        g.select('.tick:last-of-type').append('text')
          .classed('unit-label', true)
          .attr('dy', '-1em')
          .text(props.axes.y.label);
      };
    },
    draw: function() {
      var self = this;

      this.el.root = this.el.container.append('svg')
        .attr('viewBox', [0, 0, this.size.w, this.size.h].join(' '));

      // draw background
      this.el.bg = this.el.root.append('g')
        .attr('class', 'bg')
        .attr('transform', 'translate(' + [-this.util.axes.x.scale.step()/2, 0].join(',') + ')');

      var rectangles = this.el.bg.selectAll('rect').data(this.rows.user);
      rectangles.exit().remove();
      rectangles.enter().append('rect').merge(rectangles)
        .attr('x', function(d) { return self.util.axes.x.scale(d.x); })
        .attr('y', this.util.axes.y.scale(this.props.axes.y.max))
        .attr('width', this.util.axes.x.scale.step())
        .attr('height', this.util.axes.y.scale(this.props.axes.y.min) - this.util.axes.y.scale(this.props.axes.y.max))
        .attr('fill', function(d) { return colors[d.label]; });

      var lastPresident = 'hui';
      this.rows.user.forEach(function(row, i, rows) {
        var [president, term] = row.label.split('-');
        if(president != lastPresident) {
          self.el.bg.append('text')
            .text(presidents[president])
            .attr('class', 'president')
            .attr('x', self.util.axes.x.scale(row.x))
            .attr('y', self.util.axes.y.scale(self.props.axes.y.max))
            .attr('dx', '0.25rem')
            .attr('dy', '0.25rem');
        }
        lastPresident = president;
      })

      // draw x axis
      this.el.x = this.el.root.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', 'translate(' + [0, this.size.p].join(',') + ')')
        .call(this.util.axes.x.customize);

      // draw y axis
      this.el.y = this.el.root.append('g')
        .attr('class', 'axis axis-y')
        .call(this.util.axes.y.customize);

      // make space for circles and paths
      if(!!this.props.compare) {
        self.el.comp = [];
        this.props.compare.forEach(function(comp, i) {
          var g = self.el.root.append('g').attr('class', 'sequence comp');
          self.el.comp.push(g);
          self.drawComp(i, comp.label);
        });
      }
      this.el.user = this.el.root.append('g').attr('class', 'sequence user');
      this.el.orig = this.el.root.append('g').attr('class', 'sequence orig');

      // add button to finish and show comparison
      this.el.button = d3.select(this.$el).select('.after').append('button')
        .text('不想畫啦')
        .on('click', function() {
          // remove animation
          self.el.container.select('.you-draw').remove();

          self.rows.orig.forEach(function(row) {
            row.show = true;
          });
          self.drawOrig();
          self.el.root.on('mousedown', null);
          self.el.root.on('mousedown.drag', null);

          d3.select(self.$el).select('.after').classed('reveal', true);
        });

      // make callback to redraw at user input
      function redraw() {
        // remove animation
        self.el.container.select('.you-draw').remove();
        // toggle button text
        self.el.button.text('畫好了啦');

        // get input position
        var m = d3.mouse(this);
        var x = m[0];
        var y = Math.max(self.size.p, Math.min(m[1], self.size.h - self.size.p));

        // find point to modify
        for(var target = 0; x > self.util.axes.x.scale.range()[0] + self.util.axes.x.scale.step()*(target + 0.5); target++);
        if(target < self.rows.user.length && !self.rows.orig[target].fix) {
          self.rows.user[target].y = self.util.axes.y.scale.invert(y);
          self.rows.user[target].show = true;
          self.drawUser();
        }
      }

      // execute callback on click/touch/drag
      this.el.root.on('mousedown', redraw);
      this.el.root.call(d3.drag().on('drag', redraw));

      // draw original sequence
      this.drawOrig();

      // setup animation
      var lastOrig = this.rows.orig.filter(function(row, i) {
        return row.fix && i + 1 < self.rows.orig.length && !self.rows.orig[i + 1].fix;
      }).pop();
      var viewport = $(window).width();
      var zoom = viewport > this.size.w ? 1 : viewport/this.size.w;
      this.el.container.select('.you-draw')
        .style('top', this.util.axes.y.scale(lastOrig.y)*zoom - 54 + 'px')
        .style('left', this.util.axes.x.scale(lastOrig.x)*zoom + 'px');
    }
  }
}
