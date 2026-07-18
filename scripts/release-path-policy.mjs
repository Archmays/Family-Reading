import path from 'node:path';

const CARMELA_BOOK_PREFIX = 'public/books/不一样的卡梅拉/';

function assertInside(baseDir, targetPath, label) {
  const relative = path.relative(baseDir, targetPath);
  if (
    relative === ''
    || relative.startsWith('..')
    || path.isAbsolute(relative)
  ) {
    throw new Error(`${label} must stay inside ${baseDir}.`);
  }
}

export function resolveCarmelaBookPaths({ folder, rootDir, outputDir }) {
  const repositoryPath = String(folder ?? '').replaceAll('\\', '/');
  const parts = repositoryPath.split('/');

  if (
    repositoryPath === ''
    || repositoryPath.startsWith('/')
    || /^[A-Za-z]:\//.test(repositoryPath)
    || repositoryPath.includes('//')
    || parts.some((part) => part === '' || part === '.' || part === '..')
    || !repositoryPath.startsWith(CARMELA_BOOK_PREFIX)
    || parts.length !== 4
  ) {
    throw new Error(`Invalid Carmela book folder: ${repositoryPath || '<empty>'}`);
  }

  const sourcePath = path.resolve(rootDir, ...parts);
  const targetPath = path.resolve(outputDir, ...parts);
  assertInside(path.resolve(rootDir), sourcePath, 'Carmela source path');
  assertInside(path.resolve(outputDir), targetPath, 'Carmela output path');

  return {
    repositoryPath,
    sourcePath,
    targetPath,
  };
}
