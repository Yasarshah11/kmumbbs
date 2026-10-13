// Curriculum tree + keyword classifier shared by the parser and the app data build.
// Source: "KMU First Year MBBS Chapters distribution" and the KMU Block C syllabus in the resource folder.

export const BLOCKS = {
  A: { name: 'Block A', modules: ['foundation', 'blood'] },
  B: { name: 'Block B', modules: ['msk'] },
  C: { name: 'Block C', modules: ['cvs', 'resp'] },
};

export const SUBJECTS = {
  anatomy: 'Anatomy',
  histology: 'Histology',
  embryology: 'Embryology',
  physiology: 'Physiology',
  biochemistry: 'Biochemistry',
  minor: 'Minor subjects',
};

// weights = MCQs per subject in the KMU paper for that module
export const MODULES = {
  foundation: { name: 'Foundation', block: 'A', weights: { anatomy: 12, histology: 10, embryology: 15, physiology: 10, biochemistry: 14 } },
  blood: { name: 'Blood', block: 'A', weights: { histology: 4, physiology: 22, biochemistry: 12 } },
  msk: { name: 'Musculoskeletal', block: 'B', weights: { anatomy: 71, histology: 8, embryology: 4, physiology: 16, biochemistry: 16 } },
  cvs: { name: 'Cardiovascular', block: 'C', weights: { anatomy: 9, histology: 4, embryology: 5, physiology: 34, biochemistry: 14, minor: 4 } },
  resp: { name: 'Respiratory', block: 'C', weights: { anatomy: 12, histology: 4, embryology: 3, physiology: 20, biochemistry: 8, minor: 3 } },
};

// [module, subject, keywords]. Longer / rarer phrases are worth more (see classify()).
const K = [
  ['foundation', 'anatomy', 'anatomical position|sagittal|coronal plane|sesamoid|pneumatic bone|epiphys|diaphys|metaphys|ossification cent|synovial joint|cartilaginous joint|fibrous joint|suture|syndesmosis|gomphosis|symphysis|synchondrosis|saddle joint|pivot joint|hinge joint|ball and socket|bursa|aponeurosis|deep fascia|superficial fascia|dermatome|myotome|end arter|anastomos|lymph node|thoracic duct|neuroglia|ganglion|sympathetic chain|langer|hilton|wolff|nutrient artery|long bone|flat bone|irregular bone|prime mover|antagonist|synergist|fixator|pennate|raphe|retinacul|type of joint|skeleton|vertebral column|fontanelle'],
  ['foundation', 'histology', 'epitheli|goblet|microvilli|cilia|stereocilia|basement membrane|tight junction|desmosome|gap junction|zonula|macula adherens|exocrine|merocrine|apocrine|holocrine|serous acin|mucous acin|connective tissue|fibroblast|mast cell|plasma cell|collagen fib|reticular fib|elastic fib|adipose|ground substance|glycocalyx|golgi|lysosome|peroxisome|ribosome|endoplasmic reticulum|mitochondri|cytoskeleton|microtubul|centriole|nucleolus|heterochromatin|euchromatin|stain|light microscop|electron microscop|areolar'],
  ['foundation', 'embryology', 'gametogenesis|oogenesis|spermatogenesis|spermiogenesis|oocyte|polar body|meiosis|mitosis|zygote|morula|blastocyst|blastomere|trophoblast|cytotrophoblast|syncytiotrophoblast|implantation|fertiliz|capacitation|acrosome|zona pellucida|corona radiata|corpus luteum|ovulation|bilaminar|trilaminar|epiblast|hypoblast|gastrulation|primitive streak|notochord|neural tube|neural crest|neurulation|somite|ectoderm|mesoderm|endoderm|yolk sac|amnio|chorion|allantois|placenta|decidua|umbilical cord|teratogen|twins|hcg|ectopic pregnancy|hydatidiform|week of development|embryonic period|fetal period|oligohydramnios|polyhydramnios|nondisjunction|trisomy|karyotype|sacrococcygeal'],
  ['foundation', 'physiology', 'homeostasis|negative feedback|positive feedback|extracellular fluid|intracellular fluid|cell membrane|simple diffusion|facilitated diffusion|osmosis|osmol|active transport|na\\+?-?k\\+? ?atpase|sodium.potassium pump|co-?transport|counter-?transport|symport|antiport|endocytosis|exocytosis|pinocytosis|phagocytosis|resting membrane potential|nernst|goldman|action potential|depolariz|repolariz|hyperpolariz|refractory period|voltage.gated|saltatory|myelin|nerve fib|rheobase|chronaxie|apoptosis|second messenger|g.protein|ligand'],
  ['foundation', 'biochemistry', 'carbohydrate|monosaccharide|disaccharide|polysaccharide|glucose|fructose|galactose|sucrose|lactose|maltose|starch|glycogen|cellulose|epimer|anomer|isomer|reducing sugar|glycosid|mucopolysaccharide|nucleotide|nucleoside|nucleic acid|purine|pyrimidine|adenine|guanine|cytosine|thymine|uracil|dna|rna|chargaff|histone|chromatin|ph\\b|buffer|henderson|pka|acid.base|surface tension|viscosity|colloid|osmotic pressure|donnan|biomolecule|organelle|cell fractionation|marker enzyme'],
  ['blood', 'physiology', 'erythrocyte|red blood cell|\\brbc|erythropo|hemoglobin|haemoglobin|anemia|anaemia|polycythemia|hematocrit|haematocrit|\\bmcv\\b|\\bmch\\b|mchc|reticulocyte|iron deficiency|transferrin|ferritin|vitamin b12|intrinsic factor|folic|megaloblast|pernicious|sickle|thalass|spherocyt|hemolysis|haemolysis|bilirubin|jaundice|leukocyte|white blood cell|\\bwbc|neutrophil|eosinophil|basophil|monocyte|macrophage|lymphocyte|chemotaxis|diapedesis|leukemia|leukopenia|immunity|antibod|immunoglobulin|antigen|complement|t cell|b cell|helper|cytotoxic|mhc|hypersensitiv|allerg|anaphyla|vaccin|blood group|\\babo\\b|rh factor|rhesus|erythroblastosis|transfusion|cross.?match|agglutin|platelet|thrombocyt|hemostasis|haemostasis|coagulation|clotting|prothrombin|thrombin|fibrin|plasmin|heparin|warfarin|hemophilia|haemophilia|von willebrand|bleeding time|vitamin k|bone marrow|plasma protein|esr\\b'],
  ['blood', 'histology', 'blood smear|lymph node|spleen|thymus|tonsil|lymphoid|white pulp|red pulp|hassall|germinal cent|peyer|malt\\b|reticular cell|megakaryocyte|granulocyte|agranulocyte'],
  ['blood', 'biochemistry', 'heme synthesis|haem synthesis|porphyri|ala synthase|aminolevulin|protoporphyrin|ferrochelatase|bilirubin|biliverdin|urobilin|stercobilin|conjugated|kernicterus|crigler|gilbert|dubin|albumin|globulin|ceruloplasmin|haptoglobin|electrophoresis|acute phase|multiple myeloma|bence|methemoglobin|carboxyhemoglobin|hba1c|hbf|hbs|2,?3.?bpg|2,?3.?dpg|thiamin|riboflavin|niacin|pyridoxine|biotin|pantothen|cobalamin|folate|ascorbic|vitamin c|vitamin b|beriberi|pellagra|scurvy|wernicke'],
  ['msk', 'anatomy', 'humerus|scapula|clavicle|radius|ulna|carpal|scaphoid|lunate|metacarpal|phalanx|phalanges|shoulder|axilla|brachial plexus|deltoid|pectoralis|serratus|latissimus|trapezius|rotator cuff|supraspinatus|infraspinatus|teres|subscapularis|biceps|triceps|brachialis|coracobrachialis|cubital fossa|forearm|pronator|supinator|flexor|extensor|wrist|carpal tunnel|anatomical snuff|hand|thenar|hypothenar|lumbrical|interosse|palmar|median nerve|ulnar nerve|radial nerve|axillary nerve|musculocutaneous|long thoracic|erb|klumpke|claw hand|wrist drop|winging|cephalic vein|basilic vein|brachial artery|radial artery|ulnar artery|axillary artery|femur|tibia|fibula|patella|hip bone|ilium|ischium|pubis|acetabul|pelvi|talus|calcaneus|navicular|cuboid|cuneiform|metatarsal|gluteal|gluteus|piriformis|thigh|femoral triangle|femoral nerve|femoral artery|femoral canal|femoral sheath|adductor canal|quadriceps|sartorius|hamstring|popliteal|knee|menisc|cruciate|leg\\b|tibialis|peroneal|fibularis|gastrocnemius|soleus|tendo|achilles|ankle|foot|plantar|arch of foot|sciatic|obturator|saphenous|tibial nerve|common peroneal|foot drop|trendelenburg|hip joint|inguinal ligament|iliotibial|erector spinae|vertebra|intervertebral|spinal nerve|upper limb|lower limb|dupuytren|colles|supracondylar|compartment syndrome'],
  ['msk', 'histology', 'hyaline cartilage|elastic cartilage|fibrocartilage|chondrocyte|chondroblast|perichondrium|lacuna|osteoblast|osteoclast|osteocyte|osteon|haversian|volkmann|lamella|canalicul|periosteum|endosteum|compact bone|spongy bone|woven bone|endochondral|intramembranous|epiphyseal plate|sarcomere|myofibril|skeletal muscle fib|smooth muscle fib|endomysium|perimysium|epimysium|t.tubule|sarcoplasmic|triad|a band|i band|z line|h zone'],
  ['msk', 'embryology', 'somite|sclerotome|myotome|dermatome|dermomyotome|limb bud|apical ectodermal ridge|zone of polarizing|amelia|meromelia|phocomelia|polydactyly|syndactyly|club ?foot|talipes|achondroplasia|limb development|limb rotation|hox gene|myoblast|paraxial mesoderm|lateral plate|poland|prune belly|craniosynostosis'],
  ['msk', 'physiology', 'skeletal muscle|smooth muscle|actin|myosin|troponin|tropomyosin|cross.?bridge|sliding filament|excitation.contraction|neuromuscular junction|motor end.?plate|acetylcholine|acetylcholinesterase|curare|botulinum|myasthenia|motor unit|tetan|summation|fatigue|isometric|isotonic|rigor mortis|muscle tone|fast twitch|slow twitch|length.tension|dihydropyridine|ryanodine|calmodulin|latch|muscle hypertrophy|muscle atrophy|creatine phosphate|end.?plate potential'],
  ['msk', 'biochemistry', 'amino acid|peptide bond|primary structure|secondary structure|tertiary structure|quaternary|alpha.?helix|beta.?sheet|b.sheet|denaturation|isoelectric|zwitterion|essential amino|glycine|proline|hydroxyproline|collagen|elastin|keratin|fibrous protein|globular protein|ehlers|osteogenesis imperfecta|marfan|scurvy|glycosaminoglycan|\\bgags?\\b|proteoglycan|hyaluronic|chondroitin|heparan|mucopolysaccharidos|calcium|phosph|magnesium|zinc|copper|iron\\b|iodine|selenium|fluor|mineral|trace element|vitamin a|vitamin d|vitamin e|vitamin k|retinol|retinal|calciferol|calcitriol|tocopherol|rickets|osteomalacia|night blindness|xerophthalmia|fat.soluble|wilson|menkes|hemochromatosis|parathyroid|calcitonin'],
  ['cvs', 'anatomy', 'heart|atrium|ventricle|auricle|interventricular|interatrial|fossa ovalis|crista terminalis|musculi pectinati|trabeculae carneae|papillary muscle|chordae|mitral|tricuspid|aortic valve|pulmonary valve|coronary|circumflex|anterior interventricular|left anterior descending|coronary sinus|cardiac vein|pericardi|transverse sinus|oblique sinus|sa node|av node|bundle of his|purkinje|conducting system|aorta|arch of aorta|brachiocephalic|superior vena cava|inferior vena cava|azygos|ligamentum arteriosum|apex beat|cardiac plexus|sternocostal surface|base of heart|tamponade'],
  ['cvs', 'histology', 'intercalated dis|cardiac muscle|tunica intima|tunica media|tunica adventitia|elastic artery|muscular artery|arteriole|capillar|fenestrated|sinusoid|venule|vasa vasorum|internal elastic lamina|endocardium|myocardium|epicardium|pericyte'],
  ['cvs', 'embryology', 'heart tube|cardiac loop|bulbus cordis|truncus arteriosus|sinus venosus|septum primum|septum secundum|foramen ovale|ostium primum|ostium secundum|endocardial cushion|aortic arch|pharyngeal arch arter|ductus arteriosus|ductus venosus|fetal circulation|umbilical vein|umbilical arter|vitelline|cardinal vein|atrial septal defect|ventricular septal defect|\\basd\\b|\\bvsd\\b|\\bpda\\b|tetralogy|fallot|transposition|coarctation|dextrocardia|ligamentum venosum|ligamentum teres|cardiogenic'],
  ['cvs', 'physiology', 'cardiac output|stroke volume|heart rate|ejection fraction|end.diastolic|end.systolic|preload|afterload|frank.starling|cardiac cycle|isovolum|heart sound|\\bs1\\b|\\bs2\\b|\\bs3\\b|\\bs4\\b|murmur|stenosis|regurgitation|ecg|ekg|p wave|qrs|t wave|pr interval|qt interval|st segment|heart block|arrhythmi|fibrillation|flutter|tachycardia|bradycardia|pacemaker|plateau|chronotrop|inotrop|dromotrop|blood pressure|hypertension|hypotension|mean arterial|pulse pressure|baroreceptor|chemoreceptor reflex|vasomotor|renin|angiotensin|aldosterone|\\banp\\b|vasodilat|vasoconstrict|poiseuille|resistance|compliance|capacitance|laminar|turbulent|reynold|venous return|central venous|capillary|starling force|filtration|edema|oedema|lymph flow|autoregulation|reactive hyperemia|coronary blood flow|shock|hemorrhag|haemorrhag|cardiac failure|heart failure|korotkoff|windkessel|bainbridge|cushing reflex|circulation'],
  ['cvs', 'biochemistry', 'lipid|fatty acid|triglyceride|triacylglycerol|phospholipid|sphingo|cholesterol|lipoprotein|\\bldl\\b|\\bhdl\\b|vldl|chylomicron|apolipoprotein|apo ?b|saponification|iodine number|rancidity|eicosanoid|prostaglandin|thromboxane|leukotriene|arachidonic|omega.3|linoleic|linolenic|micelle|bile salt|ketone|atherosclerosis|troponin|creatine kinase|ck.mb|\\bldh\\b|lactate dehydrogenase|\\bast\\b|\\bsgot\\b|myoglobin|myocardial infarction|cardiac marker|cardiac enzyme|lecithin|cephalin|ganglioside|cerebroside|niemann|gaucher|tay.sachs'],
  ['resp', 'anatomy', 'lung|pleura|trachea|bronch|carina|hilum|bronchopulmonary segment|diaphragm|phrenic|intercostal|rib\\b|ribs\\b|sternum|sternal angle|manubrium|xiphoid|thoracic wall|thoracic inlet|thoracic outlet|costal|mediastin|esophag|oesophag|thoracic duct|vagus|recurrent laryngeal|costodiaphragmatic|pneumothorax|thoracocentesis|chest tube|internal thoracic|thoracic vertebra|typical rib|atypical rib|cervical rib|horizontal fissure|oblique fissure|lingula|pulmonary ligament'],
  ['resp', 'histology', 'respiratory epithelium|pseudostratified ciliated|type i pneumocyte|type ii pneumocyte|pneumocyte|alveolar macrophage|dust cell|clara cell|club cell|alveolar duct|alveolar sac|respiratory bronchiole|terminal bronchiole|blood.air barrier|olfactory epithelium|trachealis'],
  ['resp', 'embryology', 'lung bud|respiratory diverticulum|laryngotracheal|tracheoesophageal|tracheo-oesophageal|pseudoglandular|canalicular|terminal sac|alveolar period|surfactant|septum transversum|pleuroperitoneal|diaphragmatic hernia|bochdalek|morgagni|pericardioperitoneal|hyaline membrane|respiratory distress syndrome|pulmonary hypoplasia'],
  ['resp', 'physiology', 'ventilation|tidal volume|vital capacity|residual volume|functional residual|inspiratory reserve|expiratory reserve|total lung capacity|spirometr|fev1|\\bfvc\\b|dead space|alveolar pressure|pleural pressure|transpulmonary|compliance|surfactant|surface tension|airway resistance|work of breathing|pulmonary circulation|pulmonary edema|pulmonary oedema|v/q|ventilation.perfusion|shunt|diffusing capacity|respiratory membrane|partial pressure|po2|pco2|pao2|oxygen dissociation|oxyhemoglobin|oxyhaemoglobin|p50|bohr|haldane|chloride shift|carbonic anhydrase|carbon dioxide transport|oxygen transport|respiratory cent|dorsal respiratory|ventral respiratory|pneumotaxic|apneustic|hering.breuer|chemoreceptor|carotid body|aortic bod|hypoxia|hypercapnia|cyanosis|cheyne|sleep apn|periodic breathing|high altitude|acclimatiz|mountain sickness|decompression|deep sea|nitrogen narcosis|asthma|emphysema|copd|restrictive|obstructive|atelectasis|dyspnea|dyspnoea|respiratory acidosis|respiratory alkalosis|inspiration|expiration|breathing|respirat'],
  ['resp', 'biochemistry', 'enzyme|coenzyme|cofactor|apoenzyme|holoenzyme|prosthetic group|active site|allosteric|michaelis|\\bkm\\b|vmax|lineweaver|competitive inhibit|non.?competitive|uncompetitive|suicide inhibit|isoenzyme|isozyme|zymogen|oxidoreductase|transferase|hydrolase|lyase|isomerase|ligase|activation energy|catalys|turnover number|feedback inhibition|covalent modification|enzyme kinetic|lock and key|induced fit|ribozyme|free energy'],
];

// Minor subjects are cross-module; they get a module from the paper's block when it is unambiguous.
const MINOR = 'pharmac|drug|bioavailab|half.?life|first.pass|agonist|antagonist|route of administration|parenteral|sublingual|levodopa|dose|pathology|necrosis|apoptosis|inflammation|cell injury|atrophy|hypertrophy|hyperplasia|metaplasia|dysplasia|keloid|granuloma|hyperaemia|hyperemia|thrombosis|embolism|infarct|community medicine|epidemiolog|prevention|primordial|primary prevention|secondary prevention|tertiary prevention|screening|incidence|prevalence|reservoir|vaccine|epi\\b|immunization|immunisation|health education|forensic|medico.?legal|autopsy|asphyxia|sudden death|precipitin|consent|confidential|ethic|professionalism|communication|counsel|empathy|breaking bad news|research|hypothesis|literature review|pubmed|mesh\\b|boolean|plagiarism|qualitative|quantitative|study design|cohort|case.control|cross.sectional|randomi|sampling|variable|questionnaire|behaviou?r|reinforcement|conditioning|personality|stress|coping|belief|norms|culture|biopsychosocial|learning style|feedback|team|leadership|islam|pakistan studies';

const compiled = K.map(([module, subject, kw]) => ({
  module,
  subject,
  terms: kw.split('|').map((t) => ({ re: new RegExp(/^\\b|\\b$/.test(t) || t.length < 5 ? `\\b${t.replace(/^\\b|\\b$/g, '')}` : t, 'gi'), w: t.replace(/\\./g, '').length > 9 ? 2 : 1 })),
}));
const minorTerms = MINOR.split('|').map((t) => new RegExp(t.length < 6 ? `\\b${t}` : t, 'gi'));

/** Classify a question. block (A/B/C or null) narrows the candidate modules. */
export function classify(text, block) {
  const t = text.toLowerCase();
  let best = null;
  for (const c of compiled) {
    if (block && MODULES[c.module].block !== block) continue;
    let score = 0;
    for (const { re, w } of c.terms) {
      re.lastIndex = 0;
      const m = t.match(re);
      if (m) score += w * Math.min(m.length, 2);
    }
    if (score && (!best || score > best.score)) best = { module: c.module, subject: c.subject, score };
  }
  let minor = 0;
  for (const re of minorTerms) {
    re.lastIndex = 0;
    if (re.test(t)) minor++;
  }
  if (minor && (!best || minor > best.score)) {
    const mods = block ? BLOCKS[block].modules : [];
    return { module: mods.length === 1 ? mods[0] : best ? best.module : mods[0] || null, subject: 'minor', score: minor };
  }
  return best || { module: null, subject: null, score: 0 };
}
