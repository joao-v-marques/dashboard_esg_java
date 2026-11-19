package com.joao_v_marques.dashboard_esg.lawsuits.loss_probability;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "loss_probabilities")
@Getter
@Setter
@NoArgsConstructor
public class LossProbability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name")
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
