import { Select } from '../../primitives/Select';
import type { SelectOption } from '../../primitives/Select';
import { useProperties } from '../../../contexts/PropertiesContext';
import styles from './PropertySelector.module.scss';

export interface PropertySelectorProps {
  value: string;
  onChange: (value: string) => void;
  includeAllOption?: boolean;
  disabled?: boolean;
}

const ALL_PROPERTIES_OPTION: SelectOption = { value: '', label: 'All Properties' };

export function PropertySelector({
  value,
  onChange,
  includeAllOption = true,
  disabled = false,
}: PropertySelectorProps) {
  const { properties, loading, error } = useProperties();

  const propertyOptions: SelectOption[] = properties.map((property) => ({
    value: property.id,
    label: `${property.name} - ${property.street}, ${property.postcode}`,
  }));

  const options: SelectOption[] = includeAllOption
    ? [ALL_PROPERTIES_OPTION, ...propertyOptions]
    : propertyOptions;

  return (
    <div className={styles.propertySelector}>
      <Select
        label="Property"
        name="property-selector"
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled || loading || !!error}
        error={!!error}
        helperText={error ?? undefined}
        fullWidth
        size="small"
        placeholder={!includeAllOption ? 'Select a property' : undefined}
      />
    </div>
  );
}
