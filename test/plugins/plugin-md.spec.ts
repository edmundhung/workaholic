import { Miniflare } from 'miniflare';
import path from 'path';
import generate from '../../src/commands/generate';
import preview from '../../src/commands/preview';
import createClient from '../../src/createClient';
import { setupBuild } from '../../src/plugins/plugin-md';
import { Entry } from '../../src/types';
import data from '../fixtures/sample-json.json';

describe('plugin-md', () => {
  let entries: Entry[];
  let namespace: KVNamespace;

  beforeAll(async () => {
    const mf = new Miniflare({
      script: 'addEventListener("fetch", () => {});',
      buildCommand: '',
    });

    entries = await generate({
      source: path.resolve(__dirname, '../fixtures'),
      builds: [setupBuild()],
    });
    namespace = await mf.getKVNamespace('test');

    await preview(namespace, entries);
  });

  it('transforms data by parsing md content', async () => {
    const client = createClient(namespace);
    const { metadata, ...content } = data;

    expect(await client.getData('sample-markdown')).toEqual({
      content: `
# Mulcet vincere

## Vel longoque coniugialia erat

Lorem markdownum gentemque incerti, genibus? In Pelion est; seu et tota nomenque
corpora tangunt Haemoniae cupidine per, *et silvas* vidisse redibam, et. Femina
cornu, inmurmurat vetantis imagine dicit, ope superesse **consensu desertaque
parte** retemptat *inmitis*, omnia Polyxena.

1. Lacrimas in dicta saepius ista mutua nomen
2. Mors Romam reges revocamina decebat veluti
3. Mutavit iaculante portat posuit
4. Erat mei celebrabant densa mansit

## Quam mihi diversa

Dicenti lacrimis mea genero tamen divino mandatam rurigenae provida. Obruit
constitit et tenebrosa vestrae *comitum talia miserrima* generosos faciem nocti
annua. Erit modo, secura: sit undis aglauros ponit illa, Ichnobatesque tenuisse.
Interceperit silvas, sua nymphas solis ab **fiant**.

- Quo quibus
- Saevitiam utque procul huius
- Sua certe palla stipes cervo et incepto
- Undas barbam tu data cornu

Det arbiter in bracchia quae. Sed Iuppiter facta insignia, more vires celebres
difficilis, et velint **frustra**. Quinque relictum. Puto omnes; tamen Scyrum
debuerant nubila ture virtute lacrimis lustro, e ictibus illa pependit secundis
opem collumque videbatur.

## Tigres virga falleris iugulo fuissem at exitio

Ulixe micabant excussaque mittam! Ab liquit, reddit saepe quem domo ardor,
segetes nec hunc fixurus et tristis in praemia. Signum en pressant, sic vices
nec infamia morsus et iacentia.

Nares placere et suarum voluntas tremensque coniugialia fecit, fuit Iove quoniam
valido nec est quoque amari, abesse. Nec et tenui, fuerat tecto querellae sui.
Fugit monilia Caesaris sanguine: hic
[nec](http://ulteriusinflata.io/omnibus-cum) annos.

1. Illic pulchram novique fiducia lapsa
2. Tyrioque spina genitoris nebulasque vertice invictos sonat
3. Cytherea mentis incubuitque sola ingenti

Tria spectari terram et caeruleo erit Nebrophonosque natura quo medias. *Amens*
diu nisi, sepulcro et longius eminet annos absit formas.
      `.trim(),
      metadata,
    });
  });
});
