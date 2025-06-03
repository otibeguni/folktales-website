import { type IFilterSelect } from '@/types';

const Select: React.FC<IFilterSelect> = ({
  value = '',
  label,
  options,
  handleChange,
}) => {
  return (
    <select
      value={value}
      onChange={handleChange}
      className="select min-w-full lg:min-w-[200px]"
    >
      <option disabled>{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
