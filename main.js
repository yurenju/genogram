var svgWidth = 1000;
var svgHeight = 1000;
var regular = 50;

function findTopScore(score, person) {
  let results = person.parents.map(parent => findTopScore(score+1, parent));
  if (results.length === 0) {
    return { person, score };
  }
  else {
    return results.reduce((a, b) => {
      return (a.score > b.score) ? a : b;
    }, {person, score});
  }
}

function draw(svg, person, level) {
  var y = level * 100 + regular;
  var couple = [person];

  var rect = svg.rect(regular, regular)
    .move('50%', y)
    .fill('#FFF')
    .stroke('#000');
}

function normalize(json) {
  var relationships = {};
  var persons = {};

  json.persons.forEach(p => {
    persons[p.id] = p;
    p.score = 0;
    p.children = [];
    p.parents = [];
    p.partner = [];
    p.drawn = false;
  });
  json.relationships.forEach(r => {
    relationships[r.id] = r;
    if (r.type === 'ParentChild') {
      let person1 = persons[r.person1];
      let person2 = persons[r.person2];

      person1.children.push(person2);
      person2.parents.push(person1);
    }
    else if (r.type === 'Couple') {
      let person1 = persons[r.person1];
      let person2 = persons[r.person2];

      person1.partner.push(person2);
      person2.partner.push(person1);
    }
  });

  let ancestor = {score: 0};
  json.persons.forEach(person => {
    let result = findTopScore(0, person);
    if (result.score > ancestor.score) {
      ancestor = result;
    }
  });

  console.log('ancestor', ancestor);
  let lines = [];

  json.relationships.forEach(r => {
    if (r.type === 'Couple') {
      couple = [r.person1, r.person2].sort();
      let familyNode1 = `"Family-connection-${couple[0]}-${couple[1]}-1"`;
      let familyNode2 = `"Family-connection-${couple[0]}-${couple[1]}-2"`;
      let personNode1 = `"Person-${r.person1}"`;
      let personNode2 = `"Person-${r.person2}"`;
      lines.push(`${familyNode1} [shape=point,width=0,height=0,style=invis]`)
      lines.push(`${familyNode2} [shape=point,width=0,height=0,style=invis]`)
      lines.push(`${personNode1} [label="",shape=${persons[r.person1].gender === 'Male' ? 'box' : 'oval' }]`);
      lines.push(`${personNode2} [label="",shape=${persons[r.person2].gender === 'Male' ? 'box' : 'oval' }]`)
      lines.push(`{rank=same; ${personNode1} -- ${familyNode1} -- ${personNode2};}`);
      lines.push(`${familyNode1} -- ${familyNode2}`);
    }

    if (r.type === 'ParentChild') {
      let person2 = persons[r.person2];
      if (person2.parents.length === 2) {
        let parents = person2.parents.sort();
        let familyNode2 = `"Family-connection-${parents[0].id}-${parents[1].id}-2"`;
        let edge = `${familyNode2} -- "Person-${person2.id}"`;
        let node = `"Person-${person2.id}" [label="",shape=${person2.gender === 'Male' ? 'box' : 'oval' }]`;
        if (lines.indexOf(edge) === -1) {
          lines.push(edge);
        }
        if (lines.indexOf(node) === -1) {
          lines.push(node);
        }
      }
    }
  });

  let graph = `
    graph G {
      splines=ortho
      ${lines.join('\n')}
    }
  `;
  let result = Viz(graph, { format: 'svg'});
  document.getElementById('graphviz').innerHTML = result;


  // var svg = SVG('drawing').size(svgWidth, svgHeight);
  // draw(svg, ancestor.person, 0);
}



fetch('/test.json')
  .then(res => res.json())
  .then(normalize)
  .catch(err => console.error(err));