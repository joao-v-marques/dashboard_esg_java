package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit_status;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "lawsuit_status")
@Getter
@Setter
@NoArgsConstructor
public class LawsuitStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name")
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
