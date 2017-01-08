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

function getPersonGraph(person) {
  //lines.push(`${personNode1} [label="",shape=${persons[r.person1].gender === 'Male' ? 'box' : 'oval' }]`);
  let now
  let attributes = {
    id: `person-${person.id}`,
    label: '',
    shape: person.gender === 'Male' ? 'box' : 'oval'
  };
  person.facts = person.facts || [];
  let attrsString = Object.keys(attributes)
              .map(key => `${key}="${attributes[key]}"`)
              .join(',');
  let facttypes = person.facts.map(f => f.type);
  let desc = [];

  person.facts.forEach(fact => {
    if (fact.type === 'Birth') {
      let age = new Date().getFullYear() - fact.date;
      desc.splice(0, 0, age + 'y');
    }
    else {
      desc.push(fact.type);
    }
  });

  return {
    attributes,
    lines: [
      `"${attributes.id}" [${attrsString}]`,
      `"${attributes.id}-desc" [shape=plaintext,label="${desc.join(',')}"]`,
      `{rank=same; "${attributes.id}" -- "${attributes.id}-desc" [style=invis]}`
    ]
  };
}

function getCoupleGraph(couple) {
  couple = couple.sort((a, b) => a.gender.length - b.gender.length);
  let coupleGraphs = couple.map(getPersonGraph);
  let output = [];
  coupleGraphs.forEach(g => output.push(...g.lines));

  let joints = ['a', 'b', 'c'].map(j => `"joint-${couple[0].id}-${couple[1].id}-${j}"`);
  joints.forEach(j => output.push(j + ' [shape=point,width=0,height=0,style=invis]'));
  output.push(`"${coupleGraphs[0].attributes.id}" -- ${joints[0]}`);
  output.push(`"${coupleGraphs[1].attributes.id}" -- ${joints[2]}`);
  output.push(`{rank=same; ${joints.join(' -- ')};}`);

  return {
    joint: joints[1],
    lines: output
  };
}

function getChildrenGraph (couple, persons, relationships) {
  let joint;
  let children = [];
  let multipleBirths = [];

  couple[0].children.forEach(child => {
    if (couple[1].children.indexOf(child) !== -1) {
      children.push(child);
    }
  });

  relationships.forEach(r => {
    if (r.type === 'MultipleBirth') {
      r.persons.forEach(child => {
        let index = children.indexOf(child);
        if (index !== -1) {
          children.splice(index, 1);
          if (multipleBirths.indexOf(r.persons) === -1) {
            multipleBirths.push(r.persons);
          }
        }
      });
    }
  });

  let output = [];
  let joints = [];

  children.forEach(child => {
    joints.push(`"joint-child-${child}"`);
  });
  multipleBirths.forEach(mb => {
    joints.push(`"multiple-bitrh-${mb.join('-')}"`);
  });
  if (joints.length % 2 === 0) {
    let index = joints.length / 2;
    joint = '"extra-joint"';
    joints.splice(index, 0, joint);
  }
  else {
    let index = joints.length - 1;
    joint = joints[index];
  }
  joints.forEach(j => {
    output.push(`${j} [shape=point,width=0,height=0,style=invis]`);
  });
  output.push(`{rank=same; ${joints.join(' -- ')};}`)

  children.forEach(child => {
    let g = getPersonGraph(persons[child]);
    output.push(...g.lines);
    output.push(`"joint-child-${child}" -- "${g.attributes.id}"`);
  });
  multipleBirths.forEach(mb => {
    let lines = [];
    mb.forEach(child => {
      let g = getPersonGraph(persons[child]);
      lines.push(...g.lines);
      lines.push(`"multiple-bitrh-${mb.join('-')}" -- "${g.attributes.id}"`);
    });
    output.push(`
    subgraph "subgraph-multiple-bitrh-${mb.join('-')}" {
      splines=polyline;
      ${lines.join('\n')}
    }
    `);
  });

  return {
    joint,
    lines: output
  };
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

      person1.children.push(person2.id);
      person2.parents.push(person1.id);
    }
    else if (r.type === 'Couple') {
      let person1 = persons[r.person1];
      let person2 = persons[r.person2];

      person1.partner.push(person2.id);
      person2.partner.push(person1.id);
    }
  });

  let lines = [];

  json.relationships.forEach(r => {
    if (r.type === 'Couple') {
      let couple = [persons[r.person1], persons[r.person2]];
      coupleGraph = getCoupleGraph(couple);
      childrenGraph = getChildrenGraph(couple, persons, json.relationships);
      lines.push(...coupleGraph.lines);
      lines.push(...childrenGraph.lines);
      lines.push(`${coupleGraph.joint} -- ${childrenGraph.joint}`);
    }
  });

  let graph = `
    graph G {
      splines=ortho
      ${lines.join('\n')}
    }
  `;
  console.log(graph);
  let result = Viz(graph, { format: 'svg'});
  document.getElementById('graphviz').innerHTML = result;


  // var svg = SVG('drawing').size(svgWidth, svgHeight);
  // draw(svg, ancestor.person, 0);
}



fetch('./test.json')
  .then(res => res.json())
  .then(normalize)
  .catch(err => console.error(err));