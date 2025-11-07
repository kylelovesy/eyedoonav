import { projectToNested, nestedToProject } from '../../src/utils/project-helpers';
import { BaseProject } from '@/domain/project/project.schema';
import { ClientPortalStatus, ProjectStatus } from '@/constants/enums';
import { DEFAULTS } from '@/constants/defaults';

const date = new Date();

const mockProject: BaseProject = {
  id: 'proj1',
  userId: 'user1',
  photographerName: 'Photog',
  projectName: 'Test Project',
  projectStatus: ProjectStatus.PLANNING,
  eventDate: date,
  email: 'test@example.com',
  phone: '1234567890',
  personAName: { firstName: 'Person', lastName: 'A' },
  personBName: { firstName: 'Person', lastName: 'B' },
  cachedProjectDashboard: false,
  clientPortalStatus: ClientPortalStatus.NONE,
  createdAt: date,
};

// The nested type is implied by the function, just need a mock
const mockNested = {
  id: 'proj1',
  userId: 'user1',
  photographerName: 'Photog',
  projectName: 'Test Project',
  projectStatus: ProjectStatus.PLANNING,
  eventDate: date,
  email: 'test@example.com',
  phone: '1234567890',
  personAName: { firstName: 'Person', lastName: 'A' },
  personBName: { firstName: 'Person', lastName: 'B' },
  cachedProjectDashboard: false,
  clientPortalStatus: ClientPortalStatus.NONE,
  createdAt: date,
};

describe('Project Helpers', () => {
  it('projectToNested should correctly map flat to nested', () => {
    const nested = projectToNested(mockProject);
    expect(nested).toEqual(mockNested);
  });

  it('nestedToProject should correctly map nested to flat', () => {
    const flat = nestedToProject(mockNested);
    expect(flat).toEqual(mockProject);
  });

  it('nestedToProject should default cachedProjectDashboard', () => {
    const nestedWithoutCache = { ...mockNested };
    delete (nestedWithoutCache as any).cachedProjectDashboard;

    const flat = nestedToProject(nestedWithoutCache);
    expect(flat.cachedProjectDashboard).toBe(DEFAULTS.DISABLED);
  });
});
