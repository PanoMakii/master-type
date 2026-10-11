const Content = (() => {
  const topics = [
    { id: 'mixed', label: 'Any topic' },
    { id: 'technology', label: 'Technology' },
    { id: 'software', label: 'Software engineering' },
    { id: 'space', label: 'Space and astronomy' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'medicine', label: 'Medicine' },
    { id: 'science', label: 'Science' },
    { id: 'business', label: 'Business' },
    { id: 'education', label: 'Education' },
    { id: 'general', label: 'General knowledge' }
  ];

  // Wikipedia article titles used to fetch real text for each topic
  const titles = {
    technology: ['Computer network', 'Internet', 'Cloud computing', 'Artificial intelligence', 'Cryptography', 'Operating system', 'Semiconductor', 'Blockchain', 'Robotics', 'Wi-Fi', 'Database', 'Machine learning', 'Smartphone'],
    software: ['Software engineering', 'Agile software development', 'Version control', 'Git', 'Software testing', 'Code refactoring', 'Software design pattern', 'Application programming interface', 'Code review', 'Continuous integration', 'DevOps', 'JavaScript', 'Compiler', 'Algorithm', 'Data structure', 'Debugging'],
    space: ['Mars', 'Jupiter', 'Saturn', 'Milky Way', 'Black hole', 'Supernova', 'International Space Station', 'Hubble Space Telescope', 'Andromeda Galaxy', 'Neutron star', 'Exoplanet', 'Apollo 11', 'Moon', 'Solar System', 'Nebula', 'Comet', 'James Webb Space Telescope', 'Venus'],
    engineering: ['Civil engineering', 'Mechanical engineering', 'Electrical engineering', 'Wind turbine', 'Aerospace engineering', 'Hydroelectricity', 'Suspension bridge', 'Structural engineering', 'Thermodynamics', 'Reinforced concrete', 'Chemical engineering', 'Internal combustion engine', 'Dam', 'Steam engine'],
    medicine: ['Medical imaging', 'Radiography', 'X-ray', 'Computed tomography', 'Magnetic resonance imaging', 'Medical ultrasound', 'Immune system', 'Vaccine', 'Antibiotic', 'Diabetes', 'Hypertension', 'Pneumonia', 'Heart', 'Anesthesia', 'Stethoscope', 'Physiology', 'Radiology'],
    science: ['Photosynthesis', 'DNA', 'Evolution', 'Periodic table', 'Quantum mechanics', 'Gravity', 'Electromagnetism', 'Plate tectonics', 'Atom', 'Chemical reaction', 'Ecosystem', 'Cell (biology)', 'Energy', 'General relativity', 'Water'],
    business: ['Supply chain', 'Marketing', 'Entrepreneurship', 'Accounting', 'Inflation', 'Stock market', 'Management', 'Economics', 'Startup company', 'Business model', 'Customer service', 'Venture capital', 'Globalization', 'Project management', 'Bookkeeping'],
    education: ['Education', 'Curriculum', 'University', 'Literacy', 'Pedagogy', 'Distance education', 'Scholarship', 'Library', 'Higher education', 'Primary education', 'Teacher', 'Lifelong learning', 'Critical thinking', 'Educational technology'],
    general: ['Ocean', 'Rainforest', 'Olympic Games', 'Printing press', 'Silk Road', 'Mount Everest', 'Sahara', 'Nile', 'Music', 'Chess', 'Language', 'Mathematics', 'Coffee', 'Association football', 'Great Wall of China', 'Amazon River']
  };

  // Offline text, used when the network is down or Wikipedia returns nothing
  const sentences = {
    technology: [
      'A computer network connects devices so they can share data, and the internet joins millions of these networks into one global system.',
      'Cloud computing lets companies rent servers, storage, and software over the internet instead of buying and maintaining their own hardware.',
      'Encryption scrambles information with a secret key so that only the person who holds the matching key can read it.',
      'A microprocessor contains billions of tiny transistors that switch on and off to carry out instructions at incredible speed.',
      'Wireless networks send data through radio waves, which is why a phone can load a web page without a single cable.',
      'Machine learning systems find patterns in large sets of examples and use those patterns to make predictions about new data.',
      'Every file on a computer is stored as a long series of binary digits, each one either a zero or a one.',
      'Strong passwords, regular updates, and two-step verification are simple habits that protect personal accounts from attackers.'
    ],
    software: [
      'A good programmer writes code that other people can read, because software is read far more often than it is written.',
      'Version control tools such as Git record every change to a project, so a team can review history and undo mistakes safely.',
      'Automated tests run each time the code changes and warn the team quickly when a new feature breaks something that used to work.',
      'An API defines how one piece of software can ask another for data, using clear rules about requests and responses.',
      'Debugging is the careful process of reproducing a problem, forming a theory about its cause, and testing that theory one step at a time.',
      'Refactoring improves the structure of existing code without changing what it does, which keeps a large project easier to maintain.',
      'Small functions with clear names are easier to test, easier to reuse, and much easier to understand months later.',
      'Code review gives every change a second pair of eyes, catching bugs early and spreading knowledge across the whole team.'
    ],
    space: [
      'Jupiter is the largest planet in the solar system, and its Great Red Spot is a storm that has raged for centuries.',
      'Light from the Sun takes about eight minutes to reach Earth, travelling at nearly three hundred thousand kilometres every second.',
      'A black hole is a region of space where gravity is so strong that nothing, not even light, can escape from it.',
      'The Milky Way is a spiral galaxy that contains hundreds of billions of stars, and our Sun is only one of them.',
      'Astronauts aboard the International Space Station orbit Earth about every ninety minutes and see sixteen sunrises each day.',
      'Saturn is famous for its bright rings, which are made of countless pieces of ice and rock circling the planet.',
      'Telescopes in space avoid the blurring effect of the atmosphere, so they can photograph distant galaxies in remarkable detail.',
      'Mars has the tallest volcano in the solar system, called Olympus Mons, which is about two and a half times the height of Mount Everest.'
    ],
    engineering: [
      'Civil engineers design bridges, roads, and dams that must carry heavy loads safely for many decades.',
      'A suspension bridge hangs its deck from steel cables, which pass over tall towers and are anchored firmly at both ends.',
      'Engineers test materials such as steel and concrete to learn exactly how much stress they can take before they bend or crack.',
      'An electric motor turns electrical energy into motion by using magnetic fields to push a rotating shaft.',
      'A wind turbine captures the energy of moving air with long blades and uses a generator to produce electricity.',
      'Every design is a balance between strength, weight, cost, and safety, and engineers must decide which trade-offs are acceptable.',
      'Reinforced concrete combines the compressive strength of concrete with the tensile strength of steel bars buried inside it.',
      'Thorough maintenance and regular inspection keep machines and structures working long after they were first built.'
    ],
    medicine: [
      'The heart is a muscular organ that pumps blood through the arteries and veins to deliver oxygen to every tissue in the body.',
      'An X-ray image is made when radiation passes through the body and dense structures such as bone absorb more of it than soft tissue.',
      'Vaccines train the immune system to recognise a harmful pathogen, so the body can respond quickly if it meets the real infection.',
      'A radiographer positions the patient carefully, selects the correct exposure, and keeps the radiation dose as low as reasonably achievable.',
      'Antibiotics kill bacteria or stop them from multiplying, but they have no effect on infections caused by viruses.',
      'Hypertension, or high blood pressure, often has no symptoms, yet it increases the risk of stroke and heart disease.',
      'Magnetic resonance imaging uses strong magnets and radio waves to produce detailed pictures of soft tissue without ionising radiation.',
      'Accurate documentation of a patient\'s history, diagnosis, and treatment is essential for safe and continuous clinical care.'
    ],
    science: [
      'Photosynthesis allows green plants to convert sunlight, water, and carbon dioxide into sugar and oxygen.',
      'DNA carries the genetic instructions of a living organism in a code made from four chemical bases.',
      'Every atom consists of a dense nucleus of protons and neutrons surrounded by a cloud of fast-moving electrons.',
      'The periodic table arranges the chemical elements by atomic number, which reveals repeating patterns in their properties.',
      'Plate tectonics explains how the huge slabs of rock that make up the Earth\'s crust slowly move and collide over millions of years.',
      'A scientific theory is supported by repeated experiments and observations, and it can be revised when new evidence appears.',
      'Gravity pulls objects with mass toward one another, which keeps the Moon in orbit around the Earth.',
      'Water is unusual because its solid form, ice, is less dense than its liquid form, so ice floats.'
    ],
    business: [
      'A business model describes how a company creates value for its customers and earns money in return.',
      'Cash flow, the movement of money in and out of a company, is often a better sign of health than profit alone.',
      'A supply chain links every step from raw materials and factories to warehouses, shipping, and the final customer.',
      'Good managers set clear goals, give honest feedback, and trust their teams to find the best way to reach the target.',
      'Inflation is a general rise in prices, which reduces how much a unit of money can buy over time.',
      'Entrepreneurs often start small, test an idea with real customers, and improve the product based on what they learn.',
      'Accurate bookkeeping records every sale and expense, giving owners the facts they need to plan and pay taxes correctly.',
      'Strong customer service turns a single purchase into a lasting relationship and brings new customers through word of mouth.'
    ],
    education: [
      'Education gives people the knowledge and skills they need to understand the world and to contribute to their communities.',
      'Reading regularly builds vocabulary, sharpens concentration, and helps students write with more clarity and confidence.',
      'A good teacher explains difficult ideas in simple steps and encourages students to ask questions without fear.',
      'Spaced practice, where a student reviews material over several days, helps memory last longer than a single night of cramming.',
      'Libraries offer free access to books, research tools, and quiet places to study for people of every age.',
      'Online learning allows students to attend lessons from home, although it requires discipline and a reliable connection.',
      'Critical thinking means asking whether a claim is supported by evidence before accepting it as true.',
      'A degree is more than a certificate; it shows years of steady effort, problem solving, and personal growth.'
    ],
    general: [
      'The Nile flows north through Egypt for thousands of kilometres and has supported farming civilisations for thousands of years.',
      'Chess has been played for more than a thousand years, and every game begins with the same sixteen pieces on each side.',
      'The printing press made books cheaper and helped ideas spread faster than at any earlier point in history.',
      'Rainforests cover a small part of the planet, yet they are home to more than half of all known land species.',
      'The first modern Olympic Games were held in Athens in 1896, and the games now take place every four years.',
      'Coffee beans are actually the seeds of a fruit, and they are roasted to bring out their flavour and aroma.',
      'A habit of walking a little every day improves mood, strengthens the heart, and costs nothing at all.',
      'Mathematics is the language of patterns, and it lies behind music, architecture, computing, and nature itself.'
    ]
  };

  // Makes text safe to type on a normal keyboard
  function format(text, punctuation = true, language = 'en') {
    let out = text
      .replace(/[‘’‚′]/g, "'")
      .replace(/[“”„«»]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/…/g, '...')
      .replace(/[   ]/g, ' ');

    if (language === 'en') {
      out = out.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, ' ');
    } else {
      out = out.replace(/[^\p{L}\p{N}\p{P}\p{Sc}\s]/gu, '');
    }

    if (!punctuation) {
      out = out.toLowerCase().replace(/-/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '');
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function offlineText(topic, chars, punctuation = true) {
    const pool = sentences[topic] || Object.values(sentences).flat();
    let text = '';
    while (text.length < chars) {
      for (const sentence of Util.shuffle(pool)) {
        if (text.length >= chars) break;
        text += sentence + ' ';
      }
    }
    return format(text, punctuation);
  }

  // ---------- 10-key ----------

  function digits(count) {
    let out = '';
    for (let i = 0; i < count; i++) out += Util.rand(0, 9);
    return out;
  }

  function withCommas(number) {
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function cents() {
    return String(Util.rand(0, 99)).padStart(2, '0');
  }

  function basicToken() {
    const roll = Util.rand(1, 10);
    if (roll === 1) return '1234567890';
    if (roll === 2) return Util.pick(['147', '258', '369', '789', '456', '123', '741', '852', '963', '159', '357']);
    if (roll === 3) return String(Util.rand(100, 999)) + '0';
    return digits(Util.rand(3, 7));
  }

  function advancedToken() {
    const type = Util.rand(1, 13);
    const a = Util.rand(2, 99);
    const b = Util.rand(2, 99);
    const month = String(Util.rand(1, 12)).padStart(2, '0');
    const day = String(Util.rand(1, 28)).padStart(2, '0');
    const year = Util.rand(2019, 2027);

    if (type === 1) return Util.rand(0, 999) + '.' + cents();
    if (type === 2) return withCommas(Util.rand(1000, 999999)) + '.' + cents();
    if (type === 3) return '$' + withCommas(Util.rand(10, 99999)) + '.' + cents();
    if (type === 4) return Util.rand(1, 99) + '.' + Util.rand(0, 9) + '%';
    if (type === 5) return a + '+' + b + '=' + (a + b);
    if (type === 6) return a + '*' + b + '=' + (a * b);
    if (type === 7) return '(' + a + '-' + b + ')/' + Util.rand(2, 9);
    if (type === 8) return '#' + Util.rand(1000, 99999);
    if (type === 9) return month + '/' + day + '/' + year;
    if (type === 10) return year + '-' + month + '-' + day;
    if (type === 11) {
      return Util.rand(10, 9999) + ' ' + Util.pick(['Oak', 'Maple', 'Cedar', 'Pine', 'Lake', 'Hill', 'Market', 'River']) + ' '
        + Util.pick(['St', 'Ave', 'Rd', 'Blvd']) + ', Apt ' + Util.rand(1, 40);
    }
    if (type === 12) {
      const amount = withCommas(Util.rand(100, 99999)) + '.' + cents();
      return Util.pick(['(' + amount + ')', '-' + amount, '+' + amount]);
    }
    return '(' + Util.rand(200, 999) + ') ' + Util.rand(200, 999) + '-' + digits(4);
  }

  function tenKey(level, chars) {
    const makeToken = level === 'advanced' ? advancedToken : basicToken;
    let text = '';
    while (text.length < chars) text += makeToken() + ' ';
    return text;
  }

  return { topics, titles, sentences, format, offlineText, tenKey };
})();
