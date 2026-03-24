interface FeatureListProps {
  features: string[];
}

export function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="space-y-3">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center text-muted-foreground">
          <span className="mr-2 text-green-500">✓</span>
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
  );
}
