const decorator = () => () => undefined;

module.exports = {
  Column: decorator,
  CreateDateColumn: decorator,
  Entity: decorator,
  JoinColumn: decorator,
  ManyToOne: decorator,
  OneToMany: decorator,
  PrimaryColumn: decorator,
  PrimaryGeneratedColumn: decorator,
  UpdateDateColumn: decorator,
  DataSource: function DataSource() {},
};
