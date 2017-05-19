Vue.component('graph', {
  mixins: [mxGraph],
  created: function() {
    Promise.all(
      [this.props.id]
        .concat(!!this.props.compare ? this.props.compare.map(function(comp) { return comp.id; }) : [])
        .map(function(id) {
          return Vue.http.get('./src/data/' + id + '.json');
        })
    ).then(this.getSuccess, this.getError);
  },
  methods: {
    getSuccess: function(responses) {
      // process responses
      // use this.$set to enable change detection
      this.$set(this.rows, 'orig', responses.shift().body);
      this.$set(this.rows, 'user', JSON.parse(JSON.stringify(this.rows.orig)));
      this.rows.user.forEach(function(row, index, rows) {
        if(row.fix && !(index + 1 < rows.length && !rows[index + 1].fix))
          row.show = false;
      });

      this.$set(this.rows, 'comp', responses.map(function(res) {
        return res.body.map(function(row) {
          return Object.assign(row, {show: true, fix: true});
        });
      }));

      // draw
      this.init();
      this.draw();
    },
    getError: function(response) {
      console.error(response);
    },
    markdown: function(text) {
      return marked(text);
    },
  },
  template: `
  <div class="graph" :id="props.id">
    <div class="before textgroup">
      <h2>{{ props.text.title }}</h2>
      <div class="text a-text-only" v-html="markdown(props.text.before)"></div>
    </div>
    <div class="draw">
      <div class="you-draw">
        <div class="line"></div>
        <div class="hand"></div>
      </div>
    </div>
    <div class="after textgroup">
      <div class="score d-flex justify-content-center align-items-center"><div>畫的有</div><div class="number">{{ score }}</div><div>分像呢</div></div>
      <div class="text a-text-only" v-html="markdown(props.text.after)"></div>
    </div>
  </div>
  `,
});

var app = new Vue({
  el: '#app',
  methods: {
  },
  data: {
    common: CommonData,
    graphs: graphs,
    header: {
      title: '蔡總統的第一年',
      description: '蔡英文政府已執政滿一週年，跟過去幾年相比，到底表現好不好呢？沃草透過比較從扁政府、馬政府到蔡政府第一年的各項數據，先讓大家自己畫出心中的感受，再來看看你跟真實數據的差異有多少吧！',
    },
    authorship: [
      {
        job: '數據分析',
        people: ['洪國鈞'],
      },
      {
        job: '編輯',
        people: ['蕭長展', '洪國鈞'],
      },
      {
        job: '設計開發',
        people: ['游知澔'],
      },
    ],
    conclusion: {
      title: '結論：執政一年、持續監督',
      description: '重點用兩個星號可以**變成粗體** 😄',
    },
  },
  methods: {
    markdown: marked,
  },
});
