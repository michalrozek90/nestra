import { EmptyState } from './empty-state';
import { Header } from './header';
import { Screen } from './screen';

type FeaturePlaceholderProps = {
  readonly title: string;
  readonly description: string;
};

export function FeaturePlaceholder({ title, description }: FeaturePlaceholderProps) {
  return (
    <Screen>
      <Header title={title} />
      <EmptyState description={description} title={title} />
    </Screen>
  );
}
