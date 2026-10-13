// Year-1 MBBS (KMU) study map. Chapters follow "KMU First Year MBBS Chapters distribution";
// Block B study order follows the Block B guidelines; Block C topics follow the KMU syllabus.
// Each topic: [title, book reference]. Add later years as new entries in YEARS.

const T = (book, topics) => ({ book, topics });

export const YEARS = [
  {
    id: 'y1',
    name: 'First Year',
    exam: 'First Professional MBBS',
    modules: {
      foundation: {
        anatomy: T('BD Chaurasia General Anatomy', [
          ['Introduction & anatomical terms', 'Ch 1'], ['Skeleton', 'Ch 2'], ['Joints', 'Ch 3'], ['Muscles', 'Ch 4'],
          ['Cardiovascular system', 'Ch 5'], ['Lymphatic system', 'Ch 6'], ['Nervous system', 'Ch 7'], ['Skin and fascia', 'Ch 8'],
        ]),
        histology: T("Laiq Hussain's Histology", [
          ['Cell', 'Ch 2'], ['Epithelium', 'Ch 3'], ['Glands', 'Ch 4'], ['Connective tissue', 'Ch 5'], ['Connective tissue proper', 'Ch 6'],
        ]),
        embryology: T("Langman's Medical Embryology", [
          ['Gametogenesis', 'Ch 2'], ['First week: ovulation to implantation', 'Ch 3'], ['Second week: bilaminar disc', 'Ch 4'],
          ['Third week: trilaminar disc', 'Ch 5'], ['Third to eighth weeks: embryonic period', 'Ch 6'], ['Fetal membranes & placenta', 'Ch 8, p.110'],
        ]),
        physiology: T('Guyton & Hall', [
          ['Functional organisation & homeostasis', 'Ch 1'], ['The cell and its functions', 'Ch 2'],
          ['Transport across cell membranes', 'Ch 4'], ['Membrane & action potentials', 'Ch 5'],
        ]),
        biochemistry: T('Satyanarayana / Pankaja Naik', [
          ['Biomolecules & the cell', 'Satya Ch 1 · Naik Ch 1'], ['Carbohydrates', 'Satya Ch 2 · Naik Ch 2'],
          ['Nucleic acids & nucleotides', 'Satya Ch 5 · Naik Ch 7'], ['pH and buffers', 'Satya Ch 21'], ['Biophysical chemistry', 'Satya Ch 40 · Naik Ch 24'],
        ]),
      },
      blood: {
        histology: T("Laiq Hussain's Histology", [['Blood', 'Ch 9'], ['Immune system & lymphoid organs', 'Ch 14']]),
        physiology: T('Guyton & Hall, Unit VI', [
          ['Red blood cells, anaemia & polycythaemia', 'Ch 33'], ['Leukocytes, macrophages & inflammation', 'Ch 34'],
          ['Immunity & allergy', 'Ch 35'], ['Blood types, transfusion & transplantation', 'Ch 36'], ['Haemostasis & blood coagulation', 'Ch 37'],
        ]),
        biochemistry: T('Satyanarayana / Pankaja Naik', [
          ['Plasma proteins', 'Satya Ch 9 · Naik Ch 27'], ['Haemoglobin & porphyrins', 'Satya Ch 10 · Naik Ch 6'],
          ['Water-soluble vitamins (B & C)', 'Satya Ch 7 · Naik Ch 16'],
        ]),
      },
      msk: {
        anatomy: T("Snell's Clinical Anatomy", [
          ['Upper limb osteology', 'Ch 3'], ['Shoulder region & axilla', 'Ch 3'], ['Brachial plexus', 'Ch 3'], ['Arm & cubital fossa', 'Ch 3'],
          ['Forearm', 'Ch 3'], ['Hand', 'Ch 3'], ['Joints of the upper limb', 'Ch 3'], ['Blood supply of the upper limb', 'Ch 3'],
          ['Upper limb clinicals', 'Ch 3'],
          ['Lower limb osteology', 'Ch 4'], ['Gluteal region', 'Ch 4'], ['Thigh & femoral triangle', 'Ch 4'], ['Leg & popliteal fossa', 'Ch 4'],
          ['Foot & arches', 'Ch 4'], ['Joints of the lower limb', 'Ch 4'], ['Nerves & vessels of the lower limb', 'Ch 4'], ['Lower limb clinicals', 'Ch 4'],
          ['Back: muscles, vertebral column & spinal nerve (low yield)', 'Ch 2'],
        ]),
        histology: T("Laiq Hussain's Histology", [['Cartilage', 'Ch 7'], ['Bone & ossification', 'Ch 8'], ['Muscle tissue', 'Ch 10']]),
        embryology: T("Langman's Medical Embryology", [['Somitogenesis', 'Ch 6, p.80'], ['Muscular system', 'Ch 11'], ['Limbs', 'Ch 12']]),
        physiology: T('Guyton & Hall', [
          ['Contraction of skeletal muscle', 'Ch 6'], ['Neuromuscular junction & excitation-contraction coupling', 'Ch 7'], ['Smooth muscle', 'Ch 8'],
        ]),
        biochemistry: T('Satyanarayana / Pankaja Naik', [
          ['Proteins & amino acids', 'Satya Ch 4 · Naik Ch 4'], ['Mineral metabolism', 'Satya Ch 18 · Naik Ch 17'],
          ['Fat-soluble vitamins (A, D, E, K)', 'Satya Ch 7 · Naik Ch 16'], ['Connective tissue & collagen', ''], ['Glycosaminoglycans', ''],
        ]),
      },
      // Block C topics come from the syllabus parse in build.mjs; these are the book references.
      cvs: {
        anatomy: T("Snell's Clinical Anatomy", [['Thorax I', 'Ch 4'], ['Thorax II: heart', 'Ch 5']]),
        histology: T("Laiq Hussain's Histology", [['Circulatory system', 'Ch 13']]),
        embryology: T("Langman's Medical Embryology", [['Cardiovascular system', 'Ch 13']]),
        physiology: T('Guyton & Hall, Units III-IV', [['Heart', 'Ch 9-13'], ['Circulation', 'Ch 14-24']]),
        biochemistry: T('Satyanarayana / Pankaja Naik', [['Lipids', 'Satya Ch 3 · Naik Ch 3'], ['Cardiac enzymes', 'Satya Ch 6 · Naik Ch 5']]),
      },
      resp: {
        anatomy: T("Snell's Clinical Anatomy", [['Thorax II: remaining topics', 'Ch 5']]),
        histology: T("Laiq Hussain's Histology", [['Respiratory system', 'Ch 17']]),
        embryology: T("Langman's Medical Embryology", [['Respiratory system', 'Ch 14'], ['Diaphragm', 'Ch 7, p.101'], ['Ribs and sternum', '']]),
        physiology: T('Guyton & Hall, Unit VII', [['Respiration', 'Ch 38-43']]),
        biochemistry: T('Satyanarayana / Pankaja Naik', [['Enzymes', 'Satya Ch 6 · Naik Ch 5']]),
      },
    },
  },
];

// Strategy notes distilled from the Block B guidelines in the resource folder.
export const TIPS = {
  msk: {
    anatomy: 'Study each limb in order: osteology, muscles, blood supply, nerve supply, joints, then clinicals. Most scenario questions come from the clinicals. The back is low yield.',
    histology: 'Use flowcharts for cartilage and bone; know both types of ossification; compare skeletal with smooth muscle.',
    embryology: 'Aim for concepts, not volume. OSPE weight is minimal: congenital disorder pictures and two causes each.',
    physiology: 'Short and easy marks: sarcomere structure, contraction mechanism, isotonic versus isometric.',
    biochemistry: 'Tabulate fat-soluble vitamins (source, function, deficiency, toxicity). Know protein classification and mineral deficiency states for the viva.',
  },
};
