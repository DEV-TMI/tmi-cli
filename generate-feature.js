#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const featureName = args.find(arg => !arg.startsWith('--'));
const flags = {
  uiOnly: args.includes('--ui-only'),
  noSlice: args.includes('--no-slice'),
};

if (!featureName) {
  console.error('Usage: yarn generate-feature <feature-name> [--ui-only] [--no-slice]');
  console.error('\nOptions:');
  console.error('  --ui-only    Create only UI layer (screens, components, hooks)');
  console.error('  --no-slice   Skip Redux slice generation');
  process.exit(1);
}

const featurePath = path.join(__dirname, '..', 'src', 'features', featureName);

const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
const pascalCase = str =>
  str
    .split(/[-_]/)
    .map(capitalize)
    .join('');
const camelCase = str => {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const Feature = pascalCase(featureName);
const feature = camelCase(featureName);

function createDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
    console.log(`Created: ${dir}`);
  }
}

function createFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`Created: ${filePath}`);
  }
}

// ============= TEMPLATES =============

const entityTemplate = `export interface ${Feature} {
  id: string;
  // Add your entity properties
  createdAt: string;
  updatedAt: string;
}

export interface Create${Feature}Request {
  // Add creation fields
}

export interface Update${Feature}Request {
  // Add update fields
}

export interface ${Feature}Error {
  code: string;
  message: string;
  field?: string;
}
`;

const repositoryInterfaceTemplate = `import type {${Feature}, Create${Feature}Request, Update${Feature}Request} from '../entities';

export interface I${Feature}Repository {
  getById(id: string): Promise<${Feature}>;
  getAll(): Promise<${Feature}[]>;
  create(data: Create${Feature}Request): Promise<${Feature}>;
  update(id: string, data: Update${Feature}Request): Promise<${Feature}>;
  delete(id: string): Promise<void>;
}
`;

const dataSourceTemplate = `import type {${Feature}, Create${Feature}Request, Update${Feature}Request} from '../../domain/entities';

export class ${Feature}DataSource {
  private basePath = '/${feature}s';

  async getById(id: string): Promise<${Feature}> {
    // TODO: Replace with actual API call
    // const response = await apiClient.get(\`\${this.basePath}/\${id}\`);
    // return response.data;
    
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    return {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getAll(): Promise<${Feature}[]> {
    // TODO: Replace with actual API call
    // const response = await apiClient.get(this.basePath);
    // return response.data;
    
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    return [];
  }

  async create(data: Create${Feature}Request): Promise<${Feature}> {
    // TODO: Replace with actual API call
    // const response = await apiClient.post(this.basePath, data);
    // return response.data;
    
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    return {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ${Feature};
  }

  async update(id: string, data: Update${Feature}Request): Promise<${Feature}> {
    // TODO: Replace with actual API call
    // const response = await apiClient.patch(\`\${this.basePath}/\${id}\`, data);
    // return response.data;
    
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    return {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ${Feature};
  }

  async delete(id: string): Promise<void> {
    // TODO: Replace with actual API call
    // await apiClient.delete(\`\${this.basePath}/\${id}\`);
    
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    console.log('Deleted:', id);
  }
}

export const ${feature}DataSource = new ${Feature}DataSource();
`;

const repositoryImplTemplate = `import type {I${Feature}Repository} from '../../domain/repositories';
import type {${Feature}, Create${Feature}Request, Update${Feature}Request} from '../../domain/entities';
import type {${Feature}DataSource} from '../datasources';

export class ${Feature}RepositoryImpl implements I${Feature}Repository {
  constructor(private dataSource: ${Feature}DataSource) {}

  getById(id: string): Promise<${Feature}> {
    return this.dataSource.getById(id);
  }

  getAll(): Promise<${Feature}[]> {
    return this.dataSource.getAll();
  }

  create(data: Create${Feature}Request): Promise<${Feature}> {
    return this.dataSource.create(data);
  }

  update(id: string, data: Update${Feature}Request): Promise<${Feature}> {
    return this.dataSource.update(id, data);
  }

  delete(id: string): Promise<void> {
    return this.dataSource.delete(id);
  }
}
`;

const sliceTemplate = `import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import type {${Feature}, ${Feature}Error} from '../domain/entities';
import {${feature}DataSource} from './datasources';
import {${Feature}RepositoryImpl} from './repositories';

const ${feature}Repository = new ${Feature}RepositoryImpl(${feature}DataSource);

interface ${Feature}State {
  items: ${Feature}[];
  selected: ${Feature} | null;
  isLoading: boolean;
  error: ${Feature}Error | null;
}

const initialState: ${Feature}State = {
  items: [],
  selected: null,
  isLoading: false,
  error: null,
};

export const fetch${Feature}s = createAsyncThunk<
  ${Feature}[],
  void,
  {rejectValue: ${Feature}Error}
>('${feature}/fetchAll', async (_, {rejectWithValue}) => {
  try {
    return await ${feature}Repository.getAll();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch';
    return rejectWithValue({
      code: 'FETCH_ERROR',
      message: errorMessage,
    });
  }
});

export const fetch${Feature}ById = createAsyncThunk<
  ${Feature},
  string,
  {rejectValue: ${Feature}Error}
>('${feature}/fetchById', async (id, {rejectWithValue}) => {
  try {
    return await ${feature}Repository.getById(id);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch';
    return rejectWithValue({
      code: 'FETCH_ERROR',
      message: errorMessage,
    });
  }
});

const ${feature}Slice = createSlice({
  name: '${feature}',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    clearSelected: state => {
      state.selected = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetch${Feature}s.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetch${Feature}s.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetch${Feature}s.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? {code: 'UNKNOWN', message: 'Failed to fetch'};
      })
      .addCase(fetch${Feature}ById.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetch${Feature}ById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selected = action.payload;
      })
      .addCase(fetch${Feature}ById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? {code: 'UNKNOWN', message: 'Failed to fetch'};
      });
  },
});

export const {clearError, clearSelected} = ${feature}Slice.actions;
export default ${feature}Slice.reducer;
`;

const screenTemplate = `import React from 'react';
import {View} from 'react-native';
import {AppText} from '@shared/components/ui';

export default function ${Feature}Screen() {
  return (
    <View className="flex-1 bg-background p-4">
      <AppText variant="heading1">${Feature}</AppText>
    </View>
  );
}
`;

// ============= CREATE STRUCTURE =============

createDir(featurePath);

// Create domain layer (skip if ui-only)
if (!flags.uiOnly) {
  // Domain entities
  createDir(path.join(featurePath, 'domain', 'entities'));
  createFile(path.join(featurePath, 'domain', 'entities', `${Feature}.ts`), entityTemplate);
  createFile(path.join(featurePath, 'domain', 'entities', 'index.ts'), `export * from './${Feature}';\n`);
  
  // Domain repositories
  createDir(path.join(featurePath, 'domain', 'repositories'));
  createFile(path.join(featurePath, 'domain', 'repositories', `I${Feature}Repository.ts`), repositoryInterfaceTemplate);
  createFile(path.join(featurePath, 'domain', 'repositories', 'index.ts'), `export * from './I${Feature}Repository';\n`);
  
  // Domain usecases (empty for now)
  createDir(path.join(featurePath, 'domain', 'usecases'));
  createFile(path.join(featurePath, 'domain', 'usecases', 'index.ts'), `// Export usecases here\n`);
  
  // Domain index
  createFile(path.join(featurePath, 'domain', 'index.ts'), `export * from './entities';\nexport * from './repositories';\nexport * from './usecases';\n`);
  
  // Data datasources
  createDir(path.join(featurePath, 'data', 'datasources'));
  createFile(path.join(featurePath, 'data', 'datasources', `${Feature}DataSource.ts`), dataSourceTemplate);
  createFile(path.join(featurePath, 'data', 'datasources', 'index.ts'), `export * from './${Feature}DataSource';\n`);
  
  // Data repositories
  createDir(path.join(featurePath, 'data', 'repositories'));
  createFile(path.join(featurePath, 'data', 'repositories', `${Feature}RepositoryImpl.ts`), repositoryImplTemplate);
  createFile(path.join(featurePath, 'data', 'repositories', 'index.ts'), `export * from './${Feature}RepositoryImpl';\n`);
  
  // Data slice (skip if no-slice)
  if (!flags.noSlice) {
    createFile(path.join(featurePath, 'data', `${feature}Slice.ts`), sliceTemplate);
  }
  
  // Data index
  const dataIndexContent = flags.noSlice
    ? `export * from './datasources';\nexport * from './repositories';\n`
    : `export {\n  default as ${feature}Reducer,\n  fetch${Feature}s,\n  fetch${Feature}ById,\n  clearError,\n  clearSelected,\n} from './${feature}Slice';\nexport * from './datasources';\nexport * from './repositories';\n`;
  createFile(path.join(featurePath, 'data', 'index.ts'), dataIndexContent);
}

// Create UI layer
createDir(path.join(featurePath, 'ui', 'screens'));
createFile(path.join(featurePath, 'ui', 'screens', `${Feature}Screen.tsx`), screenTemplate);
createFile(path.join(featurePath, 'ui', 'screens', 'index.ts'), `export {default as ${Feature}Screen} from './${Feature}Screen';\n`);

createDir(path.join(featurePath, 'ui', 'components'));
createFile(path.join(featurePath, 'ui', 'components', 'index.ts'), `// Export components here\n`);

createDir(path.join(featurePath, 'ui', 'hooks'));
createFile(path.join(featurePath, 'ui', 'hooks', 'index.ts'), `// Export hooks here\n`);

createFile(path.join(featurePath, 'ui', 'index.ts'), `export * from './screens';\nexport * from './components';\nexport * from './hooks';\n`);

// Create module.ts
const moduleContent = flags.uiOnly || flags.noSlice
  ? `import {AppModule} from '@app/modules';
import {${Feature}Screen} from './ui/screens';

export const ${feature}Module: AppModule = {
  name: '${feature}',
  routes: [
    {name: '${Feature}', component: ${Feature}Screen, stack: 'app'},
  ],
};
`
  : `import {AppModule} from '@app/modules';
import ${feature}Reducer from './data/${feature}Slice';
import {${Feature}Screen} from './ui/screens';

export const ${feature}Module: AppModule = {
  name: '${feature}',
  slices: [
    {key: '${feature}', reducer: ${feature}Reducer, persist: false},
  ],
  routes: [
    {name: '${Feature}', component: ${Feature}Screen, stack: 'app'},
  ],
};
`;
createFile(path.join(featurePath, 'module.ts'), moduleContent);

// Create feature index.ts
const featureIndexContent = flags.uiOnly
  ? `export * from './ui';\nexport {${feature}Module} from './module';\n`
  : `export * from './ui';\nexport * from './data';\nexport * from './domain';\nexport {${feature}Module} from './module';\n`;
createFile(path.join(featurePath, 'index.ts'), featureIndexContent);

// Print success message
console.log(`\n✅ Feature "${featureName}" created with Clean Architecture!`);
console.log(`\n📁 Structure:`);
console.log(`  src/features/${featureName}/`);
if (!flags.uiOnly) {
  console.log(`  ├── domain/          # Business logic (entities, repositories)`);
  console.log(`  ├── data/            # Implementation (datasources, slices)`);
}
console.log(`  ├── ui/              # Presentation (screens, components)`);
console.log(`  ├── module.ts        # Module descriptor`);
console.log(`  └── index.ts`);

console.log(`\n📝 Next steps:`);
if (!flags.uiOnly) {
  console.log(`1. Define your entities in domain/entities/${Feature}.ts`);
  console.log(`2. Implement datasource API calls in data/datasources/`);
}
console.log(`${flags.uiOnly ? '1' : '3'}. Add module to src/app/modules/registry.ts:`);
console.log(`   `);
console.log(`   import {${feature}Module} from '@features/${featureName}';`);
console.log(`   const appModules = [..., ${feature}Module];`);
console.log(`   `);
console.log(`${flags.uiOnly ? '2' : '4'}. Add route types to src/core/navigation/types.ts if needed`);
