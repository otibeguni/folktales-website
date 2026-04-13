interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  handleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const Select: React.FC<SelectProps> = ({
  value = '',
  label,
  options,
  handleChange,
}) => {
  return (
    <select
      value={value}
      onChange={handleChange}
      className="select min-w-full lg:max-w-[33%] lg:min-w-[120px]"
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
