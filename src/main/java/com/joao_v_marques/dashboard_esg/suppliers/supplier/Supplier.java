package com.joao_v_marques.dashboard_esg.suppliers.supplier;

import com.joao_v_marques.dashboard_esg.shared.banks.Bank;
import com.joao_v_marques.dashboard_esg.suppliers.supply_category.SupplyCategory;
import com.joao_v_marques.dashboard_esg.users.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "suppliers")
@Getter
@Setter
@NoArgsConstructor
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "cnpj", nullable = false, unique = true)
    private String cnpj;

    @Column(name = "corporate_name", nullable = false)
    private String corporateName;

    @Column(name = "trade_name")
    private String tradeName;

    @Column(name = "state_registration", nullable = false)
    private String stateRegistration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supply_category_id", nullable = false)
    private SupplyCategory supplyCategory;

    @Column(name = "product_description")
    private String productDescription;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "zip_code", length = 8)
    private String zipCode;

    @Column(name = "street")
    private String street;

    @Column(name = "number")
    private String number;

    @Column(name = "complement")
    private String complement;

    @Column(name = "neighborhood")
    private String neighborhood;

    @Column(name = "city")
    private String city;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "state", length = 2)
    private String state;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "contact_name", nullable = false)
    private String contactName;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "website")
    private String website;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id", nullable = false)
    private Bank bank;

    @Column(name = "agency", nullable = false)
    private String agency;

    @Column(name = "account", nullable = false)
    private String account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inserted_by", nullable = false)
    private User insertedBy;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
