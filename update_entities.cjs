const fs = require('fs');
const path = require('path');

const entities = [
  { name: 'locations', Name: 'Location', typeDir: 'locations', serviceName: 'locationService' },
  { name: 'organizations', Name: 'Organization', typeDir: 'organizations', serviceName: 'organizationService' },
  { name: 'species', Name: 'Species', typeDir: 'species', serviceName: 'speciesService' },
  { name: 'items', Name: 'Item', typeDir: 'items', serviceName: 'itemService' },
  { name: 'magic_systems', Name: 'MagicSystem', typeDir: 'magic-systems', serviceName: 'magicSystemService' },
  { name: 'lore', Name: 'Lore', typeDir: 'lore', serviceName: 'loreService' },
  { name: 'timeline_event', Name: 'TimelineEvent', typeDir: 'timeline', serviceName: 'timelineEventService' },
];

const basePath = 'C:\\Users\\Jayce\\Documents\\App Projects\\PC\\Quyll\\src\\features';

entities.forEach(ent => {
  // 1. Update Service
  const servicePath = path.join(basePath, ent.typeDir, 'services', `${ent.serviceName}.ts`);
  if (fs.existsSync(servicePath)) {
    let code = fs.readFileSync(servicePath, 'utf8');
    if (!code.includes('EntityType')) {
      code = code.replace(`import type { ${ent.Name} } from '@/types/database';`, `import type { ${ent.Name} } from '@/types/database';\nimport { EntityType } from '@/types/common';`);
      
      const enumName = ent.Name === 'MagicSystem' ? 'MagicSystem' : ent.Name === 'TimelineEvent' ? 'TimelineEvent' : ent.Name;
      
      code = code.replace(/}\);\s*$/, `  entityType: EntityType.${enumName},\n  nameColumn: 'name',\n});\n`);
      // Fix nameColumn for timeline event which might be 'title'
      if (ent.name === 'timeline_event') {
        code = code.replace(/nameColumn: 'name'/, "nameColumn: 'title'");
      }
      fs.writeFileSync(servicePath, code);
      console.log(`Updated ${servicePath}`);
    }
  }

  // 2. Update Type Schema
  const typeFiles = fs.readdirSync(path.join(basePath, ent.typeDir, 'types')).filter(f => f.endsWith('.ts'));
  const typePath = path.join(basePath, ent.typeDir, 'types', typeFiles[0]);
  if (fs.existsSync(typePath)) {
    let code = fs.readFileSync(typePath, 'utf8');
    if (!code.includes('keyword_enabled')) {
      code = code.replace(/}\);\s*export type/, `  keyword_enabled: z.boolean().default(false),\n});\n\nexport type`);
      fs.writeFileSync(typePath, code);
      console.log(`Updated ${typePath}`);
    }
  }

  // 3. Update Form Component
  const formFiles = fs.readdirSync(path.join(basePath, ent.typeDir, 'components')).filter(f => f.endsWith('Form.tsx'));
  if (formFiles.length > 0) {
    const formPath = path.join(basePath, ent.typeDir, 'components', formFiles[0]);
    let code = fs.readFileSync(formPath, 'utf8');
    if (!code.includes('keyword_enabled')) {
      code = code.replace(/import \{ Input, TextArea, Button \} from '@\/components';/, `import { Input, TextArea, Button, Checkbox } from '@/components';`);
      code = code.replace(/(\.\.\.defaultValues,\s*})/g, `keyword_enabled: false,\n      $1`);
      
      // Try to inject Checkbox before the submit button
      if (code.includes('</form>')) {
          code = code.replace(/(\s*)(<div className="[a-zA-Z0-9_-]+__actions">)/, `$1  <div className="form-row" style={{marginBottom: '1rem'}}>\n$1    <Checkbox label="Enable Keyword" hint="When enabled, this entity will be highlighted in chapters and timeline events." {...register('keyword_enabled')} />\n$1  </div>\n$1$2`);
          fs.writeFileSync(formPath, code);
          console.log(`Updated ${formPath}`);
      }
    }
  }
});
console.log('Done');
