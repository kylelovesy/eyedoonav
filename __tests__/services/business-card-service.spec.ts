import { BusinessCardService } from '../../src/services/business-card-service';
import { IBusinessCardRepository } from '../../src/repositories/i-business-card-repository';
import { ok, err } from '../../src/domain/common/result';
import { ErrorMapper } from '../../src/utils/error-mapper';
import { BusinessCard, BusinessCardUpdate } from '../../src/domain/user/business-card.schema';
import { ErrorCode } from '@/constants/error-code-registry';

// Mocks
const mockCardRepository: jest.Mocked<IBusinessCardRepository> = {
  hasCard: jest.fn(),
  getCard: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateSocialMedia: jest.fn(),
  updateContact: jest.fn(),
  generateQRCode: jest.fn(),
  generateVCard: jest.fn(),
  shareCard: jest.fn(),
  uploadQRImage: jest.fn(),
};

const mockCard: BusinessCard = {
  id: 'test-id',
  userId: 'userId-123',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  companyName: 'Test Business',
  jobTitle: null,
  street: null,
  city: null,
  postalCode: null,
  contactEmail: 'test@biz.com',
  contactPhone: null,
  website: null,
  instagram: null,
  facebook: null,
  twitter: null,
  linkedin: null,
  youtube: null,
  tiktok: null,
  pinterest: null,
  socialMediaOther: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: null,
};

const mockError = ErrorMapper.createGenericError(
  ErrorCode.DB_NOT_FOUND,
  'Database error',
  'Test error message',
  'test-context',
);

describe('BusinessCardService', () => {
  let service: BusinessCardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BusinessCardService(mockCardRepository);
  });

  describe('getBusinessCard', () => {
    it('should get business card and return it on success', async () => {
      // Arrange
      mockCardRepository.getCard.mockResolvedValue(ok(mockCard));

      // Act
      const result = await service.getBusinessCard('userId-123');

      // Assert
      expect(mockCardRepository.getCard).toHaveBeenCalledWith('userId-123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(mockCard);
      }
    });

    it('should return error on failure', async () => {
      // Arrange
      mockCardRepository.getCard.mockResolvedValue(err(mockError));

      // Act
      const result = await service.getBusinessCard('userId-123');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(mockError);
      }
    });
  });

  describe('updateBusinessCard', () => {
    it('should call repository.update and return ok', async () => {
      // Arrange
      const updates: BusinessCardUpdate = { companyName: 'New Name' };
      mockCardRepository.update.mockResolvedValue(ok(undefined));

      // Act
      const result = await service.updateBusinessCard('userId-123', updates);

      // Assert
      expect(mockCardRepository.update).toHaveBeenCalledWith('userId-123', updates);
      expect(result.success).toBe(true);
    });
  });
});
