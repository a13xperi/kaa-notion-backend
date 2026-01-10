/**
 * Skeleton Component Tests
 */

import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonStats,
} from '../Skeleton';

describe('Skeleton', () => {
  it('should render with default props', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('.skeleton');
    
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveStyle({ width: '100%', height: '1rem' });
  });

  it('should accept custom width and height', () => {
    const { container } = render(<Skeleton width={200} height={50} />);
    const skeleton = container.querySelector('.skeleton');
    
    expect(skeleton).toHaveStyle({ width: '200px', height: '50px' });
  });

  it('should accept string dimensions', () => {
    const { container } = render(<Skeleton width="50%" height="2rem" />);
    const skeleton = container.querySelector('.skeleton');
    
    expect(skeleton).toHaveStyle({ width: '50%', height: '2rem' });
  });

  it('should apply custom border radius', () => {
    const { container } = render(<Skeleton borderRadius={12} />);
    const skeleton = container.querySelector('.skeleton');
    
    expect(skeleton).toHaveStyle({ borderRadius: '12px' });
  });

  it('should accept custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />);
    const skeleton = container.querySelector('.skeleton');
    
    expect(skeleton).toHaveClass('skeleton', 'custom-class');
  });
});

describe('SkeletonText', () => {
  it('should render 3 lines by default', () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll('.skeleton-text__line');
    
    expect(lines).toHaveLength(3);
  });

  it('should render custom number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />);
    const lines = container.querySelectorAll('.skeleton-text__line');
    
    expect(lines).toHaveLength(5);
  });

  it('should make last line shorter', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll('.skeleton-text__line');
    const lastLine = lines[2];
    
    expect(lastLine).toHaveStyle({ width: '60%' });
  });
});

describe('SkeletonAvatar', () => {
  it('should render with default medium size', () => {
    const { container } = render(<SkeletonAvatar />);
    const avatar = container.querySelector('.skeleton');
    
    expect(avatar).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('should render small size', () => {
    const { container } = render(<SkeletonAvatar size="sm" />);
    const avatar = container.querySelector('.skeleton');
    
    expect(avatar).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('should render large size', () => {
    const { container } = render(<SkeletonAvatar size="lg" />);
    const avatar = container.querySelector('.skeleton');
    
    expect(avatar).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('should render extra large size', () => {
    const { container } = render(<SkeletonAvatar size="xl" />);
    const avatar = container.querySelector('.skeleton');
    
    expect(avatar).toHaveStyle({ width: '96px', height: '96px' });
  });

  it('should be circular', () => {
    const { container } = render(<SkeletonAvatar />);
    const avatar = container.querySelector('.skeleton');
    
    expect(avatar).toHaveStyle({ borderRadius: '50%' });
  });
});

describe('SkeletonCard', () => {
  it('should render with image by default', () => {
    const { container } = render(<SkeletonCard />);
    const image = container.querySelector('.skeleton-card__image');
    
    expect(image).toBeInTheDocument();
  });

  it('should render without image when hasImage is false', () => {
    const { container } = render(<SkeletonCard hasImage={false} />);
    const image = container.querySelector('.skeleton-card__image');
    
    expect(image).not.toBeInTheDocument();
  });

  it('should have custom image height', () => {
    const { container } = render(<SkeletonCard imageHeight={300} />);
    const image = container.querySelector('.skeleton-card__image');
    
    expect(image).toHaveStyle({ height: '300px' });
  });

  it('should have title and text content', () => {
    const { container } = render(<SkeletonCard />);
    const title = container.querySelector('.skeleton-card__title');
    const content = container.querySelector('.skeleton-card__content');
    
    expect(title).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });
});

describe('SkeletonTable', () => {
  it('should render 5 rows by default', () => {
    const { container } = render(<SkeletonTable />);
    const rows = container.querySelectorAll('.skeleton-table__row');
    
    expect(rows).toHaveLength(5);
  });

  it('should render custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={10} />);
    const rows = container.querySelectorAll('.skeleton-table__row');
    
    expect(rows).toHaveLength(10);
  });

  it('should render header row', () => {
    const { container } = render(<SkeletonTable />);
    const header = container.querySelector('.skeleton-table__header');
    
    expect(header).toBeInTheDocument();
  });

  it('should render 4 columns by default', () => {
    const { container } = render(<SkeletonTable />);
    const headerCells = container.querySelectorAll('.skeleton-table__header .skeleton');
    
    expect(headerCells).toHaveLength(4);
  });
});

describe('SkeletonList', () => {
  it('should render 3 items by default', () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll('.skeleton-list__item');
    
    expect(items).toHaveLength(3);
  });

  it('should render custom number of items', () => {
    const { container } = render(<SkeletonList items={5} />);
    const items = container.querySelectorAll('.skeleton-list__item');
    
    expect(items).toHaveLength(5);
  });

  it('should render avatars by default', () => {
    const { container } = render(<SkeletonList />);
    const avatars = container.querySelectorAll('.skeleton-avatar');
    
    expect(avatars).toHaveLength(3);
  });

  it('should render without avatars when hasAvatar is false', () => {
    const { container } = render(<SkeletonList hasAvatar={false} />);
    const avatars = container.querySelectorAll('.skeleton-avatar');
    
    expect(avatars).toHaveLength(0);
  });
});

describe('SkeletonStats', () => {
  it('should render 4 stat items by default', () => {
    const { container } = render(<SkeletonStats />);
    const items = container.querySelectorAll('.skeleton-stats__item');
    
    expect(items).toHaveLength(4);
  });

  it('should render custom number of stat items', () => {
    const { container } = render(<SkeletonStats count={6} />);
    const items = container.querySelectorAll('.skeleton-stats__item');
    
    expect(items).toHaveLength(6);
  });
});
